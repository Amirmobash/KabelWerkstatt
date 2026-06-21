# KabelWerkstatt

KabelWerkstatt ist ein schlankes Werkzeug für einfache Kabelbaum-Entwürfe. Du kannst Bauteile platzieren, Drähte ziehen, die Stückliste prüfen und den Entwurf als Projektdatei oder SVG exportieren. Die Oberfläche ist bewusst ruhig gehalten: keine Anmeldung, kein Framework, keine externen Pakete.

## Was wurde verbessert?

- Deutsche, natürlichere Texte in der Oberfläche.
- Stabilere Projektprüfung mit klaren Fehlern und Hinweisen.
- Sicherer Import für `.kwd.json` und normale JSON-Dateien.
- Stückliste mit Bauteilen, Leitungen, Farben, Querschnitten und Längen.
- Robuster Build-Prozess, der fehlende optionale Ordner nicht mehr hart abbrechen lässt.
- Beispielprojekt unter `examples/`.
- Arduino-Sketch für einen 25-adrigen Kabeltester unter `arduino/`.
- Tests ohne externe Abhängigkeiten.

## Voraussetzungen

- Moderner Browser für die App.
- Optional Node.js 18 oder neuer für lokalen Server, Tests und Build.

## Lokal starten

```bash
npm start
```

Danach im Browser öffnen:

```text
http://localhost:4173
```

Du kannst `index.html` auch direkt im Browser öffnen.

## Tests ausführen

```bash
npm test
```

## Build erstellen

```bash
npm run build
```

Die fertigen statischen Dateien liegen danach in `dist/`.

## Bedienung

1. Links ein Bauteil auswählen.
2. Bauteile auf der Arbeitsfläche verschieben.
3. Drahtmodus starten.
4. Erst Startbauteil, dann Zielbauteil anklicken.
5. Rechts Beschriftung, Querschnitt, Farbe, Teilenummer und Notizen pflegen.
6. Stückliste und Prüfung kontrollieren.
7. Projekt speichern oder als SVG exportieren.

## Projektdatei

KabelWerkstatt speichert Projekte als JSON-Datei mit der Endung `.kwd.json`.

```json
{
  "schemaVersion": 2,
  "appName": "KabelWerkstatt",
  "meta": {
    "name": "Demo Kabelbaum Orange-Drive",
    "vehicle": "EV Plattform DE-01",
    "revision": "A.1",
    "author": "Amir Mobahseraghdam"
  },
  "components": [],
  "wires": []
}
```

## Arduino-Kabeltester

Im Ordner `arduino/kabeltester_25_adern/` liegt ein Sketch für einen 25-adrigen Kabeltester. Er arbeitet über die serielle Schnittstelle und gibt die Ergebnisse wahlweise als JSON oder Text aus.

Wichtige Befehle:

```text
TEST
PIN 1
PIN 25
STATUS
FORMAT JSON
FORMAT TEXT
RESET
HILFE
```

## Ordnerstruktur

```text
KabelWerkstatt/
├─ arduino/
├─ examples/
├─ src/
│  ├─ assets/
│  ├─ app.js
│  ├─ core.js
│  └─ styles.css
├─ tests/
├─ tools/
├─ index.html
├─ manifest.json
├─ package.json
└─ README.md
```

## Lizenz

MIT License © 2026 Amir Mobahseraghdam
