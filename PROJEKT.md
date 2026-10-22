# Mein Rezeptbuch: Projektnotizen

Persönliches Rezeptbuch mit Einkaufsliste nach Laufweg in der Migros. Installierbare Web-App (PWA) für Android, läuft offline. Diese Datei beschreibt Aufbau und Regeln, damit Änderungen in einem neuen Chat ohne Vorwissen möglich sind.

## Wo die App liegt
- Repository: `gasa2-apps/rezeptbuch` (öffentlich, GitHub Pages aus `main`, Ordner `/`)
- Adresse: https://gasa2-apps.github.io/rezeptbuch/
- Keine weitere App unter `gasa2-apps.github.io` anlegen: Chrome erlaubt pro Domain nur eine installierte App. Unter `gasa2.github.io` liegt die Finanz-App (`GASA2/finanzgipfel-app`).
- Nutzer: ich und mein Mitbewohner, beide Android und Chrome. Mein Handy ist von der Firma verwaltet: APK-Installation ist gesperrt, deshalb Web-App.

## Dateien
- `index.html`: die ganze App (HTML, CSS, JS in einer Datei, keine Bibliotheken, keine externen Schriften)
- `sw.js`: Service Worker für Offline und Updates
- `manifest.webmanifest`: App-Name, Farben, Icons, `"id": "/rezeptbuch/"`
- `rochen-192.png`, `rochen-512.png`, `rochen-maskable-512.png`: App-Symbol (Rochen-Koch, eigenes ChatGPT-Bild)
- `.nojekyll`, `README.md`
- `cloudflare/worker.js`: Sync-Server (Cloudflare Worker mit D1-Datenbank). Läuft nicht auf GitHub, sondern wird im Cloudflare-Dashboard eingefügt.

## Regeln bei jeder Änderung
1. **In `sw.js` die `VERSION` hochzählen** (z. B. `rezeptbuch-v5` auf `rezeptbuch-v6`). Sonst bleiben Dateien im Cache der Handys alt.
2. Die Seite selbst lädt beim Öffnen mit Internet zuerst frisch aus dem Netz. Updates kommen so automatisch, ohne Neuinstallation.
3. **Symbol ändern:** Bilddateien unter neuem Namen ablegen und in `manifest.webmanifest`, `index.html` und `sw.js` (SHELL) anpassen. Auf dem Handy muss das Symbol danach einmal entfernt und neu hinzugefügt werden.
4. **Keine persönlichen Daten** ins Repository (keine Rezepte, keine Sicherungen). Das Repository ist öffentlich.
5. `noindex`-Meta bleibt drin (Suchmaschinen ausgeschlossen).
6. Keine geschützten Figuren (z. B. Pokémon) in Bildern oder Symbolen.
7. Bestehende Daten müssen erhalten bleiben: Speicherschlüssel nicht umbenennen, alte Werte beim Laden migrieren.
8. **Worker geändert?** `cloudflare/worker.js` danach im Cloudflare-Dashboard neu einfügen und bereitstellen (GitHub allein reicht nicht). Die App-Seite muss mit alter und neuer Worker-Version klarkommen.
9. Neue gespeicherte Daten, die synchronisiert werden sollen, brauchen eine eigene Zeilenart in `localRows()` und `applyRemote()` in `index.html`.

## Datenspeicher (localStorage im Browser, nur auf dem Gerät)
- `rb-recipes`: Rezepte `[{ id, name, minutes, servings, withQty, fav, steps, notes, updatedAt, ingredients: [{ name, qty, unit, aisle }] }]`
- `rb-list`: Einkaufsliste `{ items: [{ key, name, qty, unit, aisle, done, sources }], recipes: [] }`
- `rb-extra`, `rb-extra-aisles`: selbst eingetragene Zutaten und ihre Abteilung
- `rb-route`: Laufweg als Liste von Zutaten-Schlüsseln (Kleinbuchstaben) in Ladenreihenfolge
- `rb-order`: Reihenfolge der Abteilungen (meist leer, Standard gilt)
- `rb-seeded`, `rb-view`: interne Hilfswerte
- `rb-sync`: Sync-Zustand `{ code, rev, last, shadow, pending }` (nur auf dem Gerät, wird nicht synchronisiert)
- Listeneinträge haben eine feste `id` (fehlende werden beim Laden ergänzt)
- Sicherung (Datei-Export und -Import): JSON mit `app: "mein-rezeptbuch"`, `version: 1`, `savedAt` und denselben Feldern. Import ersetzt alles.

## Funktionen
- Rezepte anlegen, bearbeiten, kopieren, löschen; Favoriten mit Herz; Suche nach Name oder Zutat
- Mengen optional (Schalter «Mit Mengenangaben»); mit Mengen: Portionen umrechnen
- Ein Klick setzt Zutaten auf die Einkaufsliste; gleiche Zutaten werden zusammengefasst, Einheiten umgerechnet
- Einkaufsliste nach Laufweg sortiert, mit Abteilungs-Überschriften; abhaken, kopieren, eigene Artikel hinzufügen
- «Laufweg anpassen»: alle Zutaten per Ziehen oder Pfeilen ordnen; neue Zutaten reihen sich hinter der letzten Zutat derselben Abteilung ein
- Reiter «Zutaten»: alle gespeicherten Zutaten (ohne Haushaltssachen), Suche, neue hinzufügen mit Duplikat- und Tippfehler-Warnung
- Reiter «Haushalt»: Sachen wie WC-Papier, Abwaschmittel, Zahnpasta. Gespeichert wie eigene Zutaten (`rb-extra`), erkannt an den Abteilungen `HH_AISLES`. Mit «+ Liste» direkt auf die Einkaufsliste. Erscheinen auch im Laufweg.
- Vorschläge beim Tippen (eigene Zutaten zuerst, Tippfehler-Erkennung per Levenshtein)
- Abteilung wird automatisch erkannt: zuerst aus eigenen Rezepten gelernt, dann per Stichwortliste (`AUTO` in `index.html`)
- Abteilungen in Laufweg-Reihenfolge: Bäckerei, Früchte & Gemüse, Milch, Käse & Eier, Fleisch & Fisch, Beilagen & Saisonales, Öl, Saucen & Eingemachtes, Teigwaren, Reis & Backzutaten, Konserven & International, Gewürze, Tiefkühl, Frühstück & Snacks, Getränke, Drogerie & Körperpflege, Haushalt & Putzmittel, Sonstiges
- Auf schmalen Handys heisst der Reiter «Einkaufsliste» nur «Liste» (Platz für vier Reiter)
- Hell- und Dunkelmodus, Android-Zurück-Taste, «Sicherung speichern / laden»

## Synchronisierung
- Zwei Handys teilen ein «gemeinsames Rezeptbuch» über einen 16-stelligen Code (Link `…/rezeptbuch/#haushalt=CODE`). Wer den Code hat, kann lesen und ändern.
- Server: Cloudflare Worker + D1 (`cloudflare/worker.js`). Adresse steht in `index.html` als `SYNC_URL`. Ist sie leer, ist der Sync-Knopf ausgeblendet.
- Daten bleiben weiterhin zuerst im localStorage (offline-fähig). Jedes Rezept (`r:id`), jeder Listeneintrag (`i:id`), jede eigene Zutat (`x:name`) sowie `m:listRecipes`, `m:route`, `m:order` ist eine eigene Zeile.
- Abgleich beim Öffnen, bei Rückkehr in die App, alle 5 Sekunden und kurz nach jeder Änderung. Gleiche Zeile auf beiden Handys geändert: neuere gewinnt. Löschungen werden als leere Zeile übertragen.
- Beitreten: wahlweise eigene Daten dazunehmen (zusammenführen) oder ersetzen. «Sicherung laden» ersetzt auch beim anderen Handy.

## Offene Ideen
- (keine)
