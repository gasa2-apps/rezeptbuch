/* Mein Rezeptbuch: Synchronisierung (Cloudflare Worker + D1)
 *
 * Einrichtung im Cloudflare-Dashboard:
 *   1. D1-Datenbank anlegen (Name egal, z. B. "rezeptbuch")
 *   2. Worker anlegen, diesen Code einfügen, bereitstellen
 *   3. Im Worker unter "Bindings" die Datenbank mit dem Variablennamen DB verbinden
 * Die Tabellen legt der Worker beim ersten Aufruf selbst an.
 *
 * Ablauf: Die App schickt geänderte Zeilen (ein Rezept, ein Listeneintrag, eine Zutat …)
 * und bekommt alle Zeilen zurück, die sich seit ihrem letzten Abgleich geändert haben.
 * Bei gleichzeitigen Änderungen an derselben Zeile gewinnt die neuere.
 * Der Haushalts-Code wird nur als SHA-256-Hash gespeichert.
 */

const ORIGINS = ["https://gasa2-apps.github.io"];
const MAX_BODY = 2_000_000;
const MAX_ROWS = 500;
const PAGE = 1000;

let schemaReady = false;

async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS sync_rows (hh TEXT NOT NULL, k TEXT NOT NULL, data TEXT, updated INTEGER NOT NULL, rev INTEGER NOT NULL, PRIMARY KEY (hh, k))"),
    db.prepare("CREATE INDEX IF NOT EXISTS rows_rev ON sync_rows (hh, rev)"),
    db.prepare("CREATE TABLE IF NOT EXISTS ctr (id INTEGER PRIMARY KEY, n INTEGER NOT NULL)"),
    db.prepare("INSERT OR IGNORE INTO ctr (id, n) VALUES (1, 0)"),
  ]);
  schemaReady = true;
}

function cors(req) {
  const o = req.headers.get("Origin") || "";
  const ok = ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  return {
    "Access-Control-Allow-Origin": ok ? o : ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function reply(req, status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: Object.assign({ "Content-Type": "application/json", "Cache-Control": "no-store" }, cors(req)) });
}

async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
    if (req.method !== "POST") return reply(req, 200, { app: "rezeptbuch-sync", ok: true });
    if (!env.DB) return reply(req, 500, { error: "no_db" });

    const text = await req.text();
    if (text.length > MAX_BODY) return reply(req, 413, { error: "too_large" });
    let body;
    try { body = JSON.parse(text); } catch (e) { return reply(req, 400, { error: "bad_json" }); }

    const code = String(body.code || "");
    if (!/^[a-z0-9]{12,64}$/.test(code)) return reply(req, 400, { error: "bad_code" });
    const since = Number.isSafeInteger(body.since) && body.since >= 0 ? body.since : 0;
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length > MAX_ROWS) return reply(req, 413, { error: "too_many" });
    for (const r of rows) {
      if (!r || typeof r.k !== "string" || !r.k || r.k.length > 300) return reply(req, 400, { error: "bad_row" });
      if (r.d !== null && typeof r.d !== "string") return reply(req, 400, { error: "bad_row" });
      if (!Number.isSafeInteger(r.u) || r.u < 0) return reply(req, 400, { error: "bad_row" });
    }

    const db = env.DB;
    await ensureSchema(db);
    const hh = await sha256("rezeptbuch:" + code);

    if (rows.length) {
      const payload = JSON.stringify(rows.map((r) => ({ k: r.k, d: r.d, u: r.u })));
      // Jede Zeile bekommt eine eigene, fortlaufende Revision. Neuere Änderung gewinnt.
      await db.batch([
        db.prepare(`INSERT INTO sync_rows (hh, k, data, updated, rev)
          SELECT ?1, json_extract(j.value, '$.k'), json_extract(j.value, '$.d'), json_extract(j.value, '$.u'),
                 (SELECT n FROM ctr WHERE id = 1) + j.key + 1
          FROM json_each(?2) AS j WHERE true
          ON CONFLICT (hh, k) DO UPDATE SET data = excluded.data, updated = excluded.updated, rev = excluded.rev
          WHERE excluded.updated >= sync_rows.updated`).bind(hh, payload),
        db.prepare("UPDATE ctr SET n = n + ?1 WHERE id = 1").bind(rows.length),
      ]);
    }

    const res = await db.prepare("SELECT k, data, updated, rev FROM sync_rows WHERE hh = ?1 AND rev > ?2 ORDER BY rev LIMIT ?3")
      .bind(hh, since, PAGE).all();
    const out = (res.results || []).map((r) => ({ k: r.k, d: r.data, u: r.updated }));
    const last = res.results && res.results.length ? res.results[res.results.length - 1].rev : since;
    let known = true;
    if (since === 0 && !out.length) known = false;
    return reply(req, 200, { rev: last, rows: out, more: out.length === PAGE, known });
  },
};
