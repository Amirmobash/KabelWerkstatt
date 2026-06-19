export const APP_NAME = 'KabelWerkstatt';
export const AUTHOR = 'Amir Mobasheraghdam';
export const SCHEMA_VERSION = 1;
export const PIXEL_TO_MM = 4;

export const COMPONENT_TYPES = {
  ecu: { label: 'ECU', defaultPins: 24, width: 150, height: 76, badge: 'ECU' },
  connector: { label: 'Stecker', defaultPins: 12, width: 140, height: 70, badge: 'ST' },
  sensor: { label: 'Sensor', defaultPins: 4, width: 128, height: 64, badge: 'SE' },
  fuse: { label: 'Sicherung', defaultPins: 2, width: 122, height: 60, badge: 'SI' },
  splice: { label: 'Spleiß', defaultPins: 4, width: 118, height: 58, badge: 'SP' },
  ground: { label: 'Masse', defaultPins: 1, width: 112, height: 56, badge: 'GND' }
};

export const WIRE_COLORS = {
  BK: '#111827',
  RD: '#dc2626',
  OG: '#f97316',
  YE: '#eab308',
  GN: '#16a34a',
  BU: '#2563eb',
  WH: '#f8fafc',
  BN: '#92400e',
  VT: '#7c3aed',
  GY: '#64748b'
};

export const WIRE_GAUGES = ['0.35', '0.50', '0.75', '1.00', '1.50', '2.50', '4.00'];

export function uid(prefix = 'kw') {
  const random = Math.random().toString(36).slice(2, 9);
  const time = Date.now().toString(36).slice(-5);
  return `${prefix}-${time}-${random}`;
}

export function createNewProject(overrides = {}) {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    appName: APP_NAME,
    meta: {
      name: 'Neuer Kabelsatz',
      vehicle: 'Prototyp',
      revision: 'A',
      author: AUTHOR,
      createdAt: now,
      updatedAt: now,
      ...overrides.meta
    },
    components: overrides.components ? structuredCloneSafe(overrides.components) : [],
    wires: overrides.wires ? structuredCloneSafe(overrides.wires) : []
  };
}

export function createComponent(type, x = 160, y = 140, sequence = 1) {
  const config = COMPONENT_TYPES[type] ?? COMPONENT_TYPES.connector;
  return {
    id: uid(type),
    type,
    label: `${config.label} ${sequence}`,
    x,
    y,
    pins: config.defaultPins,
    partNumber: '',
    notes: ''
  };
}

export function createWire(from, to, options = {}) {
  return {
    id: uid('wire'),
    label: options.label ?? 'W-001',
    from: normalizeEndpoint(from),
    to: normalizeEndpoint(to),
    gauge: options.gauge ?? '0.75',
    color: options.color ?? 'OG',
    lengthMm: Number(options.lengthMm ?? 0),
    partNumber: options.partNumber ?? '',
    notes: options.notes ?? ''
  };
}

export function normalizeEndpoint(endpoint) {
  return {
    componentId: String(endpoint?.componentId ?? ''),
    pin: Number(endpoint?.pin ?? 1)
  };
}

export function getComponent(project, id) {
  return project.components.find(component => component.id === id) ?? null;
}

export function getWire(project, id) {
  return project.wires.find(wire => wire.id === id) ?? null;
}

export function getComponentGeometry(component) {
  const config = COMPONENT_TYPES[component.type] ?? COMPONENT_TYPES.connector;
  return {
    width: config.width,
    height: config.height,
    centerX: Number(component.x) + config.width / 2,
    centerY: Number(component.y) + config.height / 2
  };
}

export function endpointPoint(project, endpoint) {
  const component = getComponent(project, endpoint.componentId);
  if (!component) return null;
  const geometry = getComponentGeometry(component);
  return { x: geometry.centerX, y: geometry.centerY };
}

export function estimateWireLengthMm(project, wire) {
  const from = endpointPoint(project, wire.from);
  const to = endpointPoint(project, wire.to);
  if (!from || !to) return 0;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const routeSlack = 1.12;
  return Math.round(Math.hypot(dx, dy) * PIXEL_TO_MM * routeSlack);
}

export function hydrateWireLengths(project) {
  const next = structuredCloneSafe(project);
  next.wires = next.wires.map(wire => ({
    ...wire,
    lengthMm: Number(wire.lengthMm) > 0 ? Number(wire.lengthMm) : estimateWireLengthMm(next, wire)
  }));
  return next;
}

export function validateProject(project) {
  const errors = [];
  const warnings = [];
  const componentIds = new Set();
  const wireIds = new Set();

  if (!project || project.appName !== APP_NAME) {
    warnings.push('Projekt wurde nicht als KabelWerkstatt-Datei erkannt. Import ist trotzdem möglich.');
  }

  if (!Array.isArray(project?.components) || !Array.isArray(project?.wires)) {
    errors.push('Projektstruktur ist ungültig: components und wires müssen Arrays sein.');
    return { ok: false, errors, warnings };
  }

  if (project.components.length === 0) {
    warnings.push('Noch keine Bauteile vorhanden. Füge ECU, Stecker oder Sensoren hinzu.');
  }

  for (const component of project.components) {
    if (!component.id) errors.push(`Bauteil "${component.label ?? 'ohne Name'}" hat keine ID.`);
    if (componentIds.has(component.id)) errors.push(`Doppelte Bauteil-ID gefunden: ${component.id}.`);
    componentIds.add(component.id);
    if (!COMPONENT_TYPES[component.type]) warnings.push(`Unbekannter Bauteiltyp: ${component.type}.`);
    if (Number(component.pins) < 1) warnings.push(`${component.label ?? component.id} hat keine gültige Pinzahl.`);
  }

  for (const wire of project.wires) {
    if (!wire.id) errors.push(`Draht "${wire.label ?? 'ohne Name'}" hat keine ID.`);
    if (wireIds.has(wire.id)) errors.push(`Doppelte Draht-ID gefunden: ${wire.id}.`);
    wireIds.add(wire.id);

    const fromId = wire.from?.componentId;
    const toId = wire.to?.componentId;
    if (!componentIds.has(fromId)) errors.push(`${wire.label ?? wire.id}: Start-Bauteil fehlt.`);
    if (!componentIds.has(toId)) errors.push(`${wire.label ?? wire.id}: Ziel-Bauteil fehlt.`);
    if (fromId && toId && fromId === toId && Number(wire.from?.pin) === Number(wire.to?.pin)) {
      warnings.push(`${wire.label ?? wire.id}: Start und Ziel sind identisch.`);
    }
    if (!WIRE_GAUGES.includes(String(wire.gauge))) warnings.push(`${wire.label ?? wire.id}: ungewöhnlicher Querschnitt ${wire.gauge} mm².`);
    if (!WIRE_COLORS[String(wire.color)]) warnings.push(`${wire.label ?? wire.id}: unbekannter Farbcode ${wire.color}.`);
  }

  const connectedComponents = new Set(project.wires.flatMap(wire => [wire.from?.componentId, wire.to?.componentId]).filter(Boolean));
  for (const component of project.components) {
    if (!connectedComponents.has(component.id)) warnings.push(`${component.label ?? component.id} ist noch nicht verdrahtet.`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function buildBom(project) {
  const componentRows = new Map();
  const wireRows = new Map();
  const hydrated = hydrateWireLengths(project);

  for (const component of hydrated.components) {
    const typeName = COMPONENT_TYPES[component.type]?.label ?? component.type;
    const key = `${component.type}|${component.partNumber ?? ''}`;
    const current = componentRows.get(key) ?? {
      category: 'Bauteil',
      item: typeName,
      specification: component.partNumber || 'ohne Teilenummer',
      quantity: 0,
      lengthMm: 0
    };
    current.quantity += 1;
    componentRows.set(key, current);
  }

  for (const wire of hydrated.wires) {
    const key = `${wire.gauge}|${wire.color}|${wire.partNumber ?? ''}`;
    const current = wireRows.get(key) ?? {
      category: 'Draht',
      item: `${wire.gauge} mm² ${wire.color}`,
      specification: wire.partNumber || 'Standardleitung',
      quantity: 0,
      lengthMm: 0
    };
    current.quantity += 1;
    current.lengthMm += Number(wire.lengthMm) || 0;
    wireRows.set(key, current);
  }

  return [...componentRows.values(), ...wireRows.values()].sort((a, b) => a.category.localeCompare(b.category) || a.item.localeCompare(b.item));
}

export function serializeProject(project) {
  const next = hydrateWireLengths(project);
  next.meta = {
    ...next.meta,
    updatedAt: new Date().toISOString()
  };
  return JSON.stringify(next, null, 2);
}

export function parseProjectJson(jsonText) {
  const parsed = JSON.parse(jsonText);
  const base = createNewProject({
    meta: parsed.meta ?? {},
    components: Array.isArray(parsed.components) ? parsed.components : [],
    wires: Array.isArray(parsed.wires) ? parsed.wires : []
  });
  base.schemaVersion = Number(parsed.schemaVersion ?? SCHEMA_VERSION);
  base.appName = parsed.appName ?? APP_NAME;
  return hydrateWireLengths(base);
}

export function makeDemoProject() {
  const project = createNewProject({
    meta: {
      name: 'Demo Kabelbaum Orange-Drive',
      vehicle: 'EV Plattform DE-01',
      revision: 'A.1',
      author: AUTHOR
    }
  });

  const ecu = createComponent('ecu', 110, 300, 1);
  ecu.label = 'Zentral ECU';
  ecu.partNumber = 'KW-ECU-240';

  const fuse = createComponent('fuse', 360, 150, 1);
  fuse.label = 'Sicherung F1';
  fuse.partNumber = 'KW-FUSE-02';

  const connector = createComponent('connector', 620, 300, 1);
  connector.label = 'Stecker X1';
  connector.partNumber = 'KW-X12-OR';

  const sensor = createComponent('sensor', 920, 160, 1);
  sensor.label = 'Temp Sensor';
  sensor.partNumber = 'KW-SENS-T';

  const ground = createComponent('ground', 920, 470, 1);
  ground.label = 'Massepunkt G1';

  const splice = createComponent('splice', 450, 480, 1);
  splice.label = 'Spleiß S1';

  project.components.push(ecu, fuse, connector, sensor, ground, splice);
  project.wires.push(
    createWire({ componentId: ecu.id, pin: 1 }, { componentId: fuse.id, pin: 1 }, { label: 'W-001', gauge: '1.50', color: 'RD' }),
    createWire({ componentId: fuse.id, pin: 2 }, { componentId: connector.id, pin: 1 }, { label: 'W-002', gauge: '1.50', color: 'OG' }),
    createWire({ componentId: connector.id, pin: 2 }, { componentId: sensor.id, pin: 1 }, { label: 'W-003', gauge: '0.50', color: 'BU' }),
    createWire({ componentId: connector.id, pin: 3 }, { componentId: ground.id, pin: 1 }, { label: 'W-004', gauge: '0.75', color: 'BK' }),
    createWire({ componentId: ecu.id, pin: 8 }, { componentId: splice.id, pin: 1 }, { label: 'W-005', gauge: '0.75', color: 'GN' }),
    createWire({ componentId: splice.id, pin: 2 }, { componentId: ground.id, pin: 1 }, { label: 'W-006', gauge: '0.75', color: 'BN' })
  );

  return hydrateWireLengths(project);
}

export function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
