export const APP_NAME = 'KabelWerkstatt';
export const AUTHOR = 'Amir Mobahseraghdam';
export const SCHEMA_VERSION = 2;
export const PIXEL_TO_MM = 4;

export const COMPONENT_TYPES = {
  ecu: { label: 'ECU', defaultPins: 24, width: 158, height: 78, badge: 'ECU' },
  connector: { label: 'Stecker', defaultPins: 12, width: 146, height: 72, badge: 'X' },
  sensor: { label: 'Sensor', defaultPins: 4, width: 132, height: 64, badge: 'S' },
  fuse: { label: 'Sicherung', defaultPins: 2, width: 126, height: 60, badge: 'F' },
  splice: { label: 'Spleiß', defaultPins: 4, width: 120, height: 58, badge: 'SP' },
  ground: { label: 'Massepunkt', defaultPins: 1, width: 118, height: 56, badge: 'GND' }
};

export const WIRE_COLORS = {
  BK: { label: 'Schwarz', value: '#111827' },
  RD: { label: 'Rot', value: '#dc2626' },
  OG: { label: 'Orange', value: '#f97316' },
  YE: { label: 'Gelb', value: '#eab308' },
  GN: { label: 'Grün', value: '#16a34a' },
  BU: { label: 'Blau', value: '#2563eb' },
  WH: { label: 'Weiß', value: '#f8fafc' },
  BN: { label: 'Braun', value: '#92400e' },
  VT: { label: 'Violett', value: '#7c3aed' },
  GY: { label: 'Grau', value: '#64748b' }
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
      ...normalizeObject(overrides.meta)
    },
    components: Array.isArray(overrides.components) ? structuredCloneSafe(overrides.components) : [],
    wires: Array.isArray(overrides.wires) ? structuredCloneSafe(overrides.wires) : []
  };
}

export function createComponent(type, x = 160, y = 140, sequence = 1) {
  const safeType = COMPONENT_TYPES[type] ? type : 'connector';
  const config = COMPONENT_TYPES[safeType];
  return {
    id: uid(safeType),
    type: safeType,
    label: `${config.label} ${sequence}`,
    x: Number(x) || 0,
    y: Number(y) || 0,
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
    gauge: normalizeGauge(options.gauge),
    color: normalizeColor(options.color),
    lengthMm: Math.max(0, Number(options.lengthMm ?? 0) || 0),
    partNumber: options.partNumber ?? '',
    notes: options.notes ?? ''
  };
}

export function normalizeEndpoint(endpoint) {
  return {
    componentId: String(endpoint?.componentId ?? ''),
    pin: Math.max(1, Number(endpoint?.pin ?? 1) || 1)
  };
}

export function normalizeGauge(value) {
  const gauge = String(value ?? '0.75');
  return WIRE_GAUGES.includes(gauge) ? gauge : '0.75';
}

export function normalizeColor(value) {
  const color = String(value ?? 'OG').toUpperCase();
  return WIRE_COLORS[color] ? color : 'OG';
}

export function getComponent(project, id) {
  return project?.components?.find(component => component.id === id) ?? null;
}

export function getWire(project, id) {
  return project?.wires?.find(wire => wire.id === id) ?? null;
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
  const component = getComponent(project, endpoint?.componentId);
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
  const next = normalizeProject(project);
  next.wires = next.wires.map(wire => {
    const normalized = normalizeWire(wire);
    const estimated = estimateWireLengthMm(next, normalized);
    return {
      ...normalized,
      lengthMm: Number(normalized.lengthMm) > 0 ? Math.round(Number(normalized.lengthMm)) : estimated
    };
  });
  return next;
}

export function normalizeProject(project) {
  const base = createNewProject({ meta: project?.meta ?? {} });
  base.schemaVersion = Number(project?.schemaVersion ?? SCHEMA_VERSION) || SCHEMA_VERSION;
  base.appName = project?.appName || APP_NAME;
  base.components = Array.isArray(project?.components) ? project.components.map(normalizeComponent) : [];
  base.wires = Array.isArray(project?.wires) ? project.wires.map(normalizeWire) : [];
  return base;
}

export function normalizeComponent(component) {
  const type = COMPONENT_TYPES[component?.type] ? component.type : 'connector';
  const config = COMPONENT_TYPES[type];
  return {
    id: String(component?.id || uid(type)),
    type,
    label: String(component?.label || config.label),
    x: Number(component?.x) || 0,
    y: Number(component?.y) || 0,
    pins: Math.max(1, Number(component?.pins ?? config.defaultPins) || config.defaultPins),
    partNumber: String(component?.partNumber ?? ''),
    notes: String(component?.notes ?? '')
  };
}

export function normalizeWire(wire) {
  return {
    id: String(wire?.id || uid('wire')),
    label: String(wire?.label || 'W-001'),
    from: normalizeEndpoint(wire?.from),
    to: normalizeEndpoint(wire?.to),
    gauge: normalizeGauge(wire?.gauge),
    color: normalizeColor(wire?.color),
    lengthMm: Math.max(0, Number(wire?.lengthMm ?? 0) || 0),
    partNumber: String(wire?.partNumber ?? ''),
    notes: String(wire?.notes ?? '')
  };
}

export function validateProject(project) {
  const errors = [];
  const warnings = [];
  const componentIds = new Set();
  const wireIds = new Set();

  if (!project || project.appName !== APP_NAME) {
    warnings.push('Die Datei sieht nicht wie ein originales KabelWerkstatt-Projekt aus. Sie kann trotzdem geprüft werden.');
  }

  if (!Array.isArray(project?.components) || !Array.isArray(project?.wires)) {
    errors.push('Die Projektstruktur ist ungültig. Bauteile und Drähte müssen als Listen gespeichert sein.');
    return { ok: false, errors, warnings };
  }

  if (project.components.length === 0) {
    warnings.push('Noch keine Bauteile vorhanden. Lege zuerst ECU, Stecker oder Sensoren an.');
  }

  for (const rawComponent of project.components) {
    const component = normalizeComponent(rawComponent);
    const id = String(rawComponent?.id ?? '');

    if (!id) errors.push(`Bauteil „${component.label || 'ohne Name'}“ hat keine ID.`);
    if (id && componentIds.has(id)) errors.push(`Doppelte Bauteil-ID gefunden: ${id}.`);
    if (id) componentIds.add(id);
    if (!COMPONENT_TYPES[rawComponent?.type]) warnings.push(`Unbekannter Bauteiltyp: ${rawComponent?.type ?? 'ohne Typ'}.`);
    if (Number(rawComponent?.pins) < 1) warnings.push(`${component.label || id || 'Bauteil'} hat keine gültige Pinzahl.`);
  }

  for (const rawWire of project.wires) {
    const wire = normalizeWire(rawWire);
    const id = String(rawWire?.id ?? '');
    const fromId = String(rawWire?.from?.componentId ?? '');
    const toId = String(rawWire?.to?.componentId ?? '');

    if (!id) errors.push(`Draht „${wire.label || 'ohne Name'}“ hat keine ID.`);
    if (id && wireIds.has(id)) errors.push(`Doppelte Draht-ID gefunden: ${id}.`);
    if (id) wireIds.add(id);
    if (!componentIds.has(fromId)) errors.push(`${wire.label}: Start-Bauteil fehlt.`);
    if (!componentIds.has(toId)) errors.push(`${wire.label}: Ziel-Bauteil fehlt.`);
    if (fromId && toId && fromId === toId && Number(rawWire?.from?.pin) === Number(rawWire?.to?.pin)) {
      warnings.push(`${wire.label}: Start und Ziel sind identisch.`);
    }
    if (!WIRE_GAUGES.includes(String(rawWire?.gauge))) warnings.push(`${wire.label}: ungewöhnlicher Querschnitt ${rawWire?.gauge} mm².`);
    if (!WIRE_COLORS[String(rawWire?.color ?? '').toUpperCase()]) warnings.push(`${wire.label}: unbekannter Farbcode ${rawWire?.color}.`);
  }

  const connectedComponents = new Set(project.wires.flatMap(wire => [wire?.from?.componentId, wire?.to?.componentId]).filter(Boolean).map(String));
  for (const rawComponent of project.components) {
    const component = normalizeComponent(rawComponent);
    const id = String(rawComponent?.id ?? '');
    if (id && !connectedComponents.has(id)) warnings.push(`${component.label || id} ist noch nicht verdrahtet.`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function buildBom(project) {
  const componentRows = new Map();
  const wireRows = new Map();
  const hydrated = hydrateWireLengths(project);

  for (const component of hydrated.components) {
    const typeName = COMPONENT_TYPES[component.type]?.label ?? component.type;
    const key = `${component.type}|${component.partNumber || ''}`;
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
    const key = `${wire.gauge}|${wire.color}|${wire.partNumber || ''}`;
    const colorName = WIRE_COLORS[wire.color]?.label ?? wire.color;
    const current = wireRows.get(key) ?? {
      category: 'Leitung',
      item: `${wire.gauge} mm² · ${colorName}`,
      specification: wire.partNumber || 'Standardleitung',
      quantity: 0,
      lengthMm: 0
    };
    current.quantity += 1;
    current.lengthMm += Number(wire.lengthMm) || 0;
    wireRows.set(key, current);
  }

  return [...componentRows.values(), ...wireRows.values()]
    .sort((a, b) => a.category.localeCompare(b.category, 'de') || a.item.localeCompare(b.item, 'de'));
}

export function serializeProject(project) {
  const next = hydrateWireLengths(project);
  next.schemaVersion = SCHEMA_VERSION;
  next.appName = APP_NAME;
  next.meta = {
    ...next.meta,
    updatedAt: new Date().toISOString()
  };
  return JSON.stringify(next, null, 2);
}

export function parseProjectJson(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Die Datei enthält kein gültiges Projekt.');
  }

  const project = normalizeProject(parsed);
  return hydrateWireLengths(project);
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
  ecu.label = 'Zentral-ECU';
  ecu.partNumber = 'KW-ECU-240';

  const fuse = createComponent('fuse', 360, 150, 1);
  fuse.label = 'Sicherung F1';
  fuse.partNumber = 'KW-FUSE-02';

  const connector = createComponent('connector', 620, 300, 1);
  connector.label = 'Stecker X1';
  connector.partNumber = 'KW-X12-OR';

  const sensor = createComponent('sensor', 920, 160, 1);
  sensor.label = 'Temperatursensor';
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

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
