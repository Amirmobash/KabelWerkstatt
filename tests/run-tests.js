import assert from 'node:assert/strict';
import {
  APP_NAME,
  buildBom,
  createComponent,
  createNewProject,
  createWire,
  estimateWireLengthMm,
  hydrateWireLengths,
  makeDemoProject,
  normalizeColor,
  normalizeGauge,
  parseProjectJson,
  serializeProject,
  validateProject
} from '../src/core.js';

const project = createNewProject();
const ecu = createComponent('ecu', 0, 0, 1);
const connector = createComponent('connector', 180, 0, 1);
project.components.push(ecu, connector);
project.wires.push(createWire({ componentId: ecu.id, pin: 1 }, { componentId: connector.id, pin: 1 }, { label: 'T-001' }));

assert.equal(project.appName, APP_NAME);
assert.equal(validateProject(project).ok, true);
assert.ok(estimateWireLengthMm(project, project.wires[0]) > 0, 'Leitungslänge sollte berechnet werden.');

const hydrated = hydrateWireLengths(project);
assert.ok(hydrated.wires[0].lengthMm > 0, 'Hydrierte Leitung sollte eine Länge enthalten.');

const bom = buildBom(hydrated);
assert.ok(bom.length >= 2, 'Die Stückliste sollte Bauteile und Leitungen enthalten.');
assert.ok(bom.some(row => row.category === 'Leitung'), 'Die Stückliste sollte Leitungen gruppieren.');

const json = serializeProject(hydrated);
const imported = parseProjectJson(json);
assert.equal(imported.components.length, 2);
assert.equal(imported.wires.length, 1);
assert.equal(imported.schemaVersion, 2);

const demo = makeDemoProject();
assert.equal(validateProject(demo).ok, true);
assert.ok(demo.wires.every(wire => wire.lengthMm > 0), 'Alle Demo-Leitungen sollten Längen besitzen.');

const broken = createNewProject();
broken.wires.push(createWire({ componentId: 'missing-a', pin: 1 }, { componentId: 'missing-b', pin: 1 }));
assert.equal(validateProject(broken).ok, false, 'Ein defektes Projekt muss bei der Prüfung durchfallen.');

assert.equal(normalizeColor('rd'), 'RD');
assert.equal(normalizeColor('unknown'), 'OG');
assert.equal(normalizeGauge('1.50'), '1.50');
assert.equal(normalizeGauge('9.99'), '0.75');

assert.throws(() => parseProjectJson('{ kaputt }'), /kein gültiges JSON/);

console.log('Alle KabelWerkstatt-Tests wurden erfolgreich ausgeführt.');
