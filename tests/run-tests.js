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
  parseProjectJson,
  serializeProject,
  validateProject
} from '../src/core.js';

const project = createNewProject();
const ecu = createComponent('ecu', 0, 0, 1);
const connector = createComponent('connector', 100, 0, 1);
project.components.push(ecu, connector);
const wire = createWire({ componentId: ecu.id, pin: 1 }, { componentId: connector.id, pin: 1 }, { label: 'T-001' });
project.wires.push(wire);

assert.equal(project.appName, APP_NAME);
assert.equal(validateProject(project).ok, true);
assert.ok(estimateWireLengthMm(project, wire) > 0, 'wire length should be estimated');

const hydrated = hydrateWireLengths(project);
assert.ok(hydrated.wires[0].lengthMm > 0, 'hydrated wire should contain length');

const bom = buildBom(hydrated);
assert.ok(bom.length >= 2, 'BOM should include components and wires');

const json = serializeProject(hydrated);
const imported = parseProjectJson(json);
assert.equal(imported.components.length, 2);
assert.equal(imported.wires.length, 1);

const demo = makeDemoProject();
assert.equal(validateProject(demo).ok, true);
assert.ok(demo.wires.every(w => w.lengthMm > 0), 'demo wires should have lengths');

const broken = createNewProject();
broken.wires.push(createWire({ componentId: 'missing-a', pin: 1 }, { componentId: 'missing-b', pin: 1 }));
assert.equal(validateProject(broken).ok, false, 'broken project should fail validation');

console.log('All KabelWerkstatt tests passed.');
