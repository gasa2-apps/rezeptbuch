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

## Regeln bei jeder Änderung
1. **In `sw.js` die `VERSION` hochzählen** (z. B. `rezeptbuch-v5` auf `rezeptbuch-v6`). Sonst bleiben Dateien im Cache der Handys alt.
2. Die Seite selbst lädt beim Öffnen mit Internet zuerst frisch aus dem Netz. Updates kommen so automatisch, ohne Neuinstallation.
3. **Symbol ändern:** Bilddateien unter neuem Namen ablegen und in `manifest.webmanifest`, `index.html` und `sw.js` (SHELL) anpassen. Auf dem Handy muss das Symbol danach einmal entfernt und neu hinzugefügt werden.
4. **Keine persönlichen Daten** ins Repository (keine Rezepte, keine Sicherungen). Das Repository ist öffentlich.
5. `noindex`-Meta bleibt drin (Suchmaschinen ausgeschlossen).
6. Keine geschützten Figuren (z. B. Pokémon) in Bildern oder Symbolen.
7. Bestehende Daten müssen erhalten bleiben: Speicherschlüssel nicht umbenennen, alte Werte beim Laden migrieren.

## Datenspeicher (localStorage im Browser, nur auf dem Gerät)
- `rb-recipes`: Rezepte `[{ id, name, minutes, servings, withQty, fav, steps, notes, updatedAt, ingredients: [{ name, qty, unit, aisle }] }]`
- `rb-list`: Einkaufsliste `{ items: [{ key, name, qty, unit, aisle, done, sources }], recipes: [] }`
- `rb-extra`, `rb-extra-aisles`: selbst eingetragene Zutaten und ihre Abteilung
- `rb-route`: Laufweg als Liste von Zutaten-Schlüsseln (Kleinbuchstaben) in Ladenreihenfolge
- `rb-order`: Reihenfolge der Abteilungen (meist leer, Standard gilt)
- `rb-seeded`, `rb-view`: interne Hilfswerte
- Sicherung (Datei-Export und -Import): JSON mit `app: "mein-rezeptbuch"`, `version: 1`, `savedAt` und denselben Feldern. Import ersetzt alles.

## Funktionen
- Rezepte anlegen, bearbeiten, kopieren, löschen; Favoriten mit Herz; Suche nach Name oder Zutat
- Mengen optional (Schalter «Mit Mengenangaben»); mit Mengen: Portionen umrechnen
- Ein Klick setzt Zutaten auf die Einkaufsliste; gleiche Zutaten werden zusammengefasst, Einheiten umgerechnet
- Einkaufsliste nach Laufweg sortiert, mit Abteilungs-Überschriften; abhaken, kopieren, eigene Artikel hinzufügen
- «Laufweg anpassen»: alle Zutaten per Ziehen oder Pfeilen ordnen; neue Zutaten reihen sich hinter der letzten Zutat derselben Abteilung ein
- Reiter «Zutaten»: alle gespeicherten Zutaten, Suche, neue hinzufügen mit Duplikat- und Tippfehler-Warnung
- Vorschläge beim Tippen (eigene Zutaten zuerst, Tippfehler-Erkennung per Levenshtein)
- Abteilung wird automatisch erkannt: zuerst aus eigenen Rezepten gelernt, dann per Stichwortliste (`AUTO` in `index.html`)
- Abteilungen in Laufweg-Reihenfolge: Bäckerei, Früchte & Gemüse, Milch, Käse & Eier, Fleisch & Fisch, Beilagen & Saisonales, Öl, Saucen & Eingemachtes, Teigwaren, Reis & Backzutaten, Konserven & International, Gewürze, Tiefkühl, Frühstück & Snacks, Getränke, Sonstiges
- Hell- und Dunkelmodus, Android-Zurück-Taste, «Sicherung speichern / laden»

## Offene Ideen
- Rezepte mit dem Mitbewohner teilen: einzelnes Rezept teilen oder Sicherung zusammenführen statt ersetzen
- Echte Synchronisierung über Firebase (Firestore, Standort Zürich, anonyme Anmeldung, gemeinsamer Haushalts-Code). Vorerst zurückgestellt.
