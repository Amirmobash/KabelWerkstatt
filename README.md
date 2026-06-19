# KabelWerkstatt

**KabelWerkstatt** is an original, orange-themed wire harness design tool created by **Amir Mobasheraghdam**. It is designed as a clean GitHub-ready starter project for drawing harness layouts, connecting components with wires, validating the design, and exporting project data.

This project is written from scratch and is not a copy of any other repository. It uses plain HTML, CSS, SVG, and modern JavaScript. No framework or external package is required.

## Features

- German-inspired orange industrial UI theme.
- SVG harness workspace with grid background.
- Add ECU, connector, sensor, fuse, splice, and ground points.
- Drag components on the canvas.
- Wire mode for creating connections between components.
- Property inspector for components and wires.
- Automatic estimated wire length from canvas geometry.
- BOM summary grouped by component type and wire specification.
- Validation report for missing endpoints, duplicate IDs, and empty designs.
- Project export/import as `.kwd.json`.
- SVG export for documentation.
- Dependency-free Node build and tests.

## Requirements

- A modern browser.
- Optional: Node.js 18+ for local server, tests, and build.

## Run locally

```bash
npm start
```

Then open:

```text
http://localhost:4173
```

You can also open `index.html` directly in a browser.

## Test

```bash
npm test
```

## Build

```bash
npm run build
```

The production-ready static files will be created in `dist/`.

## GitHub upload

```bash
git init
git add .
git commit -m "Initial release of KabelWerkstatt"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kabelwerkstatt.git
git push -u origin main
```

## Project file format

KabelWerkstatt saves projects as JSON:

```json
{
  "schemaVersion": 1,
  "appName": "KabelWerkstatt",
  "meta": {
    "name": "Demo Kabelsatz",
    "vehicle": "EV Prototype",
    "revision": "A",
    "author": "Amir Mobasheraghdam"
  },
  "components": [],
  "wires": []
}
```

## Originality note

This is a newly authored project with its own name, structure, UI, data model, and implementation. It is not affiliated with or derived from HarnessForge or any other third-party project.
