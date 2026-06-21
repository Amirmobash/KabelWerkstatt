import {
  APP_NAME,
  AUTHOR,
  COMPONENT_TYPES,
  WIRE_COLORS,
  WIRE_GAUGES,
  buildBom,
  createComponent,
  createNewProject,
  createWire,
  endpointPoint,
  estimateWireLengthMm,
  getComponent,
  getComponentGeometry,
  getWire,
  hydrateWireLengths,
  makeDemoProject,
  normalizeColor,
  normalizeGauge,
  parseProjectJson,
  serializeProject,
  validateProject
} from './core.js';

const state = {
  project: makeDemoProject(),
  selected: { type: 'project', id: null },
  wireMode: false,
  pendingEndpoint: null,
  dragging: null
};

const els = {
  workspace: document.querySelector('#workspace'),
  componentLayer: document.querySelector('#componentLayer'),
  wireLayer: document.querySelector('#wireLayer'),
  inspectorContent: document.querySelector('#inspectorContent'),
  bomContent: document.querySelector('#bomContent'),
  validationContent: document.querySelector('#validationContent'),
  wireModeButton: document.querySelector('#wireModeButton'),
  wireModeHint: document.querySelector('#wireModeHint'),
  statusText: document.querySelector('#statusText'),
  projectTitle: document.querySelector('#projectTitle'),
  projectSubtitle: document.querySelector('#projectSubtitle'),
  projectNameInput: document.querySelector('#projectNameInput'),
  vehicleInput: document.querySelector('#vehicleInput'),
  revisionInput: document.querySelector('#revisionInput'),
  authorInput: document.querySelector('#authorInput'),
  importFileInput: document.querySelector('#importFileInput')
};

init();

function init() {
  document.querySelectorAll('[data-add-type]').forEach(button => {
    button.addEventListener('click', () => addComponent(button.dataset.addType));
  });

  document.querySelector('#newProjectButton').addEventListener('click', () => {
    state.project = createNewProject({ meta: { author: AUTHOR } });
    state.selected = { type: 'project', id: null };
    state.pendingEndpoint = null;
    setWireMode(false, { renderAfterChange: false });
    flashStatus('Ein neues Projekt ist bereit.');
    render();
  });

  document.querySelector('#loadDemoButton').addEventListener('click', () => {
    state.project = makeDemoProject();
    state.selected = { type: 'project', id: null };
    state.pendingEndpoint = null;
    setWireMode(false, { renderAfterChange: false });
    flashStatus('Die Demo wurde geladen.');
    render();
  });

  document.querySelector('#exportJsonButton').addEventListener('click', exportProjectJson);
  document.querySelector('#importJsonButton').addEventListener('click', () => els.importFileInput.click());
  document.querySelector('#exportSvgButton').addEventListener('click', exportWorkspaceSvg);
  els.importFileInput.addEventListener('change', importProjectJson);
  els.wireModeButton.addEventListener('click', () => setWireMode(!state.wireMode));

  for (const input of [els.projectNameInput, els.vehicleInput, els.revisionInput, els.authorInput]) {
    input.addEventListener('input', updateProjectMetaFromForm);
  }

  els.workspace.addEventListener('pointerdown', handleWorkspacePointerDown);
  els.workspace.addEventListener('pointermove', handleWorkspacePointerMove);
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('keydown', handleKeyboard);

  render();
}

function addComponent(type) {
  const count = state.project.components.filter(component => component.type === type).length + 1;
  const offset = Math.min(420, state.project.components.length * 34);
  const component = createComponent(type, 140 + offset, 130 + offset * 0.55, count);
  state.project.components.push(component);
  state.selected = { type: 'component', id: component.id };
  touchProject();
  flashStatus(`${COMPONENT_TYPES[type]?.label ?? 'Bauteil'} hinzugefügt.`);
  render();
}

function setWireMode(active, options = {}) {
  state.wireMode = active;
  if (!active) state.pendingEndpoint = null;
  els.wireModeButton.classList.toggle('active', active);
  els.wireModeButton.textContent = active ? 'Drahtmodus beenden' : 'Drahtmodus starten';
  els.wireModeHint.textContent = active
    ? 'Klicke zuerst auf das Startbauteil und danach auf das Zielbauteil. Standardmäßig wird Pin 1 verwendet.'
    : 'Wähle zwei Bauteile, um einen Draht zu erstellen.';
  if (options.renderAfterChange !== false) renderCanvas();
}

function handleWorkspacePointerDown(event) {
  const componentGroup = event.target.closest?.('.component');
  const wireGroup = event.target.closest?.('.wire');

  if (componentGroup) {
    const componentId = componentGroup.dataset.id;
    const component = getComponent(state.project, componentId);
    if (!component) return;

    if (state.wireMode) {
      handleWireModeClick(componentId);
      return;
    }

    const point = svgPoint(event);
    state.dragging = {
      id: componentId,
      startPointer: point,
      startX: Number(component.x),
      startY: Number(component.y)
    };
    state.selected = { type: 'component', id: componentId };
    els.workspace.setPointerCapture?.(event.pointerId);
    render();
    return;
  }

  if (wireGroup) {
    state.selected = { type: 'wire', id: wireGroup.dataset.id };
    render();
    return;
  }

  state.selected = { type: 'project', id: null };
  render();
}

function handleWorkspacePointerMove(event) {
  if (!state.dragging) return;
  const point = svgPoint(event);
  const component = getComponent(state.project, state.dragging.id);
  if (!component) return;

  component.x = clamp(snap(state.dragging.startX + point.x - state.dragging.startPointer.x), 0, 1160);
  component.y = clamp(snap(state.dragging.startY + point.y - state.dragging.startPointer.y), 0, 700);

  for (const wire of state.project.wires) {
    if (wire.from.componentId === component.id || wire.to.componentId === component.id) {
      wire.lengthMm = estimateWireLengthMm(state.project, wire);
    }
  }

  touchProject();
  renderCanvas();
  renderInspector();
  renderBom();
  renderValidation();
}

function stopDrag() {
  state.dragging = null;
}

function handleWireModeClick(componentId) {
  const endpoint = { componentId, pin: 1 };

  if (!state.pendingEndpoint) {
    state.pendingEndpoint = endpoint;
    state.selected = { type: 'component', id: componentId };
    flashStatus('Start gesetzt. Jetzt das Zielbauteil wählen.');
    render();
    return;
  }

  if (state.pendingEndpoint.componentId === componentId) {
    flashStatus('Bitte ein anderes Zielbauteil wählen.');
    return;
  }

  const wireNumber = String(state.project.wires.length + 1).padStart(3, '0');
  const wire = createWire(state.pendingEndpoint, endpoint, { label: `W-${wireNumber}`, color: 'OG', gauge: '0.75' });
  wire.lengthMm = estimateWireLengthMm(state.project, wire);
  state.project.wires.push(wire);
  state.selected = { type: 'wire', id: wire.id };
  state.pendingEndpoint = null;
  touchProject();
  flashStatus(`${wire.label} wurde angelegt.`);
  render();
}

function handleKeyboard(event) {
  if (event.target.matches('input, textarea, select')) return;

  if (event.key === 'Escape') {
    setWireMode(false);
    flashStatus('Auswahl beendet.');
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    deleteSelected();
  }
}

function render() {
  syncProjectForm();
  renderCanvas();
  renderInspector();
  renderBom();
  renderValidation();
}

function renderCanvas() {
  els.componentLayer.replaceChildren();
  els.wireLayer.replaceChildren();
  refreshMissingWireLengths();

  for (const wire of state.project.wires) {
    els.wireLayer.appendChild(drawWire(wire));
  }

  for (const component of state.project.components) {
    els.componentLayer.appendChild(drawComponent(component));
  }

  els.projectTitle.textContent = state.project.meta.name || APP_NAME;
  els.projectSubtitle.textContent = `${state.project.components.length} Bauteile · ${state.project.wires.length} Drähte`;
}

function refreshMissingWireLengths() {
  for (const wire of state.project.wires) {
    const length = Number(wire.lengthMm);
    if (!Number.isFinite(length) || length <= 0) {
      wire.lengthMm = estimateWireLengthMm(state.project, wire);
    }
  }
}

function drawComponent(component) {
  const config = COMPONENT_TYPES[component.type] ?? COMPONENT_TYPES.connector;
  const selected = state.selected.type === 'component' && state.selected.id === component.id;
  const pending = state.pendingEndpoint?.componentId === component.id;
  const group = svg('g', {
    class: `component ${selected ? 'selected' : ''}`,
    'data-id': component.id,
    transform: `translate(${component.x} ${component.y})`,
    tabindex: 0,
    role: 'button',
    'aria-label': `${component.label}, ${config.label}`
  });

  const radius = Math.min(18, config.height / 3);
  group.append(svg('rect', {
    class: 'component-shell',
    x: 0,
    y: 0,
    width: config.width,
    height: config.height,
    rx: radius
  }));
  group.append(svg('circle', { class: 'component-badge', cx: 24, cy: 24, r: 15 }));
  group.append(svg('text', { x: 24, y: 29, fill: '#fff7ed', 'font-size': 10, 'font-weight': 800, 'text-anchor': 'middle' }, config.badge));
  group.append(svg('text', { class: 'component-label', x: config.width / 2, y: config.height / 2 + 5 }, component.label));
  group.append(svg('text', { class: 'component-type', x: config.width / 2, y: config.height - 12 }, `${config.label} · ${component.pins}P`));
  group.append(svg('circle', {
    class: `pin-dot ${pending ? 'pending' : ''}`,
    cx: config.width,
    cy: config.height / 2,
    r: 6
  }));
  return group;
}

function drawWire(wire) {
  const from = endpointPoint(state.project, wire.from);
  const to = endpointPoint(state.project, wire.to);
  const selected = state.selected.type === 'wire' && state.selected.id === wire.id;
  const group = svg('g', { class: `wire ${selected ? 'selected' : ''}`, 'data-id': wire.id, tabindex: 0, role: 'button' });

  if (!from || !to) return group;

  const dx = Math.abs(to.x - from.x);
  const bend = Math.max(80, dx * 0.44);
  const path = `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`;
  const color = WIRE_COLORS[wire.color]?.value ?? '#475569';
  const midpoint = cubicPoint(from, { x: from.x + bend, y: from.y }, { x: to.x - bend, y: to.y }, to, 0.5);
  const colorName = WIRE_COLORS[wire.color]?.label ?? wire.color;

  group.append(svg('path', { class: 'wire-path shadow', d: path }));
  group.append(svg('path', { class: 'wire-path', d: path, stroke: color }));
  group.append(svg('text', { class: 'wire-label', x: midpoint.x, y: midpoint.y - 9 }, `${wire.label} · ${wire.gauge} mm² · ${colorName} · ${wire.lengthMm} mm`));
  return group;
}

function renderInspector() {
  const { type, id } = state.selected;

  if (type === 'component') {
    const component = getComponent(state.project, id);
    if (component) {
      renderComponentInspector(component);
      return;
    }
  }

  if (type === 'wire') {
    const wire = getWire(state.project, id);
    if (wire) {
      renderWireInspector(wire);
      return;
    }
  }

  els.inspectorContent.innerHTML = '<div class="empty-state">Wähle ein Bauteil oder einen Draht. Tipp: Im Drahtmodus einfach zwei Bauteile nacheinander anklicken.</div>';
}

function renderComponentInspector(component) {
  const typeOptions = Object.entries(COMPONENT_TYPES)
    .map(([key, value]) => `<option value="${escapeHtml(key)}" ${component.type === key ? 'selected' : ''}>${escapeHtml(value.label)}</option>`)
    .join('');

  els.inspectorContent.innerHTML = `
    <label>Typ<select data-field="type">${typeOptions}</select></label>
    <label>Beschriftung<input data-field="label" value="${escapeHtml(component.label)}" /></label>
    <div class="form-grid">
      <label>X<input data-field="x" type="number" value="${Number(component.x)}" /></label>
      <label>Y<input data-field="y" type="number" value="${Number(component.y)}" /></label>
    </div>
    <div class="form-grid">
      <label>Pins<input data-field="pins" type="number" min="1" value="${Number(component.pins)}" /></label>
      <label>Teilenummer<input data-field="partNumber" value="${escapeHtml(component.partNumber ?? '')}" /></label>
    </div>
    <label>Notizen<textarea data-field="notes" rows="3">${escapeHtml(component.notes ?? '')}</textarea></label>
    <div class="action-row">
      <button data-action="duplicate" type="button">Duplizieren</button>
      <button data-action="delete" type="button">Löschen</button>
    </div>
  `;

  bindInspectorInputs(component, 'component');
}

function renderWireInspector(wire) {
  const colorOptions = Object.entries(WIRE_COLORS)
    .map(([code, color]) => `<option value="${code}" ${wire.color === code ? 'selected' : ''}>${code} · ${escapeHtml(color.label)}</option>`)
    .join('');
  const gaugeOptions = WIRE_GAUGES
    .map(gauge => `<option value="${gauge}" ${String(wire.gauge) === gauge ? 'selected' : ''}>${gauge} mm²</option>`)
    .join('');
  const fromComponent = getComponent(state.project, wire.from.componentId);
  const toComponent = getComponent(state.project, wire.to.componentId);

  els.inspectorContent.innerHTML = `
    <label>Beschriftung<input data-field="label" value="${escapeHtml(wire.label)}" /></label>
    <div class="form-grid">
      <label>Querschnitt<select data-field="gauge">${gaugeOptions}</select></label>
      <label>Farbe<select data-field="color">${colorOptions}</select></label>
    </div>
    <div class="form-grid">
      <label>Länge in mm<input data-field="lengthMm" type="number" min="0" value="${Number(wire.lengthMm) || 0}" /></label>
      <label>Teilenummer<input data-field="partNumber" value="${escapeHtml(wire.partNumber ?? '')}" /></label>
    </div>
    <p class="hint">${escapeHtml(fromComponent?.label ?? 'Start fehlt')} Pin ${wire.from.pin} → ${escapeHtml(toComponent?.label ?? 'Ziel fehlt')} Pin ${wire.to.pin}</p>
    <label>Notizen<textarea data-field="notes" rows="3">${escapeHtml(wire.notes ?? '')}</textarea></label>
    <div class="action-row">
      <button data-action="autoLength" type="button">Länge neu berechnen</button>
      <button data-action="delete" type="button">Löschen</button>
    </div>
  `;

  bindInspectorInputs(wire, 'wire');
}

function bindInspectorInputs(entity, entityType) {
  els.inspectorContent.querySelectorAll('[data-field]').forEach(control => {
    control.addEventListener('input', () => {
      const field = control.dataset.field;
      const value = control.type === 'number' ? Number(control.value) : control.value;

      if (entityType === 'component' && field === 'type') {
        const oldGeometry = getComponentGeometry(entity);
        entity.type = COMPONENT_TYPES[value] ? value : entity.type;
        const newGeometry = getComponentGeometry(entity);
        entity.x = Math.round(Number(entity.x) + (oldGeometry.width - newGeometry.width) / 2);
        entity.y = Math.round(Number(entity.y) + (oldGeometry.height - newGeometry.height) / 2);
      } else if (entityType === 'wire' && field === 'gauge') {
        entity.gauge = normalizeGauge(value);
      } else if (entityType === 'wire' && field === 'color') {
        entity.color = normalizeColor(value);
      } else {
        entity[field] = value;
      }

      if (entityType === 'component') updateConnectedWireLengths(entity.id);
      touchProject();
      renderCanvas();
      renderBom();
      renderValidation();
    });
  });

  els.inspectorContent.querySelector('[data-action="delete"]')?.addEventListener('click', deleteSelected);
  els.inspectorContent.querySelector('[data-action="duplicate"]')?.addEventListener('click', duplicateSelectedComponent);
  els.inspectorContent.querySelector('[data-action="autoLength"]')?.addEventListener('click', () => {
    if (entityType === 'wire') {
      entity.lengthMm = estimateWireLengthMm(state.project, entity);
      touchProject();
      render();
    }
  });
}

function updateConnectedWireLengths(componentId) {
  for (const wire of state.project.wires) {
    if (wire.from.componentId === componentId || wire.to.componentId === componentId) {
      wire.lengthMm = estimateWireLengthMm(state.project, wire);
    }
  }
}

function duplicateSelectedComponent() {
  const component = getComponent(state.project, state.selected.id);
  if (!component) return;
  const clone = createComponent(component.type, Number(component.x) + 36, Number(component.y) + 36, state.project.components.length + 1);
  clone.label = `${component.label} Kopie`;
  clone.pins = Number(component.pins);
  clone.partNumber = component.partNumber ?? '';
  clone.notes = component.notes ?? '';
  state.project.components.push(clone);
  state.selected = { type: 'component', id: clone.id };
  touchProject();
  flashStatus('Bauteil dupliziert.');
  render();
}

function deleteSelected() {
  if (state.selected.type === 'component') {
    const id = state.selected.id;
    state.project.components = state.project.components.filter(component => component.id !== id);
    state.project.wires = state.project.wires.filter(wire => wire.from.componentId !== id && wire.to.componentId !== id);
    state.selected = { type: 'project', id: null };
    touchProject();
    flashStatus('Bauteil und verbundene Drähte gelöscht.');
    render();
    return;
  }

  if (state.selected.type === 'wire') {
    state.project.wires = state.project.wires.filter(wire => wire.id !== state.selected.id);
    state.selected = { type: 'project', id: null };
    touchProject();
    flashStatus('Draht gelöscht.');
    render();
  }
}

function renderBom() {
  const rows = buildBom(state.project);
  if (rows.length === 0) {
    els.bomContent.innerHTML = '<div class="empty-state">Noch keine Stückliste verfügbar.</div>';
    return;
  }

  els.bomContent.innerHTML = `
    <table class="summary-table">
      <thead><tr><th>Art</th><th>Element</th><th>Menge</th><th>Länge</th></tr></thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            <td>${escapeHtml(row.category)}</td>
            <td title="${escapeHtml(row.specification)}">${escapeHtml(row.item)}</td>
            <td>${row.quantity}</td>
            <td>${row.lengthMm ? `${row.lengthMm} mm` : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
}

function renderValidation() {
  const report = validateProject(state.project);
  const items = [];
  if (report.ok && report.warnings.length === 0) {
    items.push('<div class="validation-item ok">Alles sauber. Keine Fehler oder Warnungen gefunden.</div>');
  }
  items.push(...report.errors.map(message => `<div class="validation-item error"><strong>Fehler:</strong> ${escapeHtml(message)}</div>`));
  items.push(...report.warnings.map(message => `<div class="validation-item warning"><strong>Hinweis:</strong> ${escapeHtml(message)}</div>`));
  els.validationContent.innerHTML = items.join('');
}

function syncProjectForm() {
  els.projectNameInput.value = state.project.meta.name ?? '';
  els.vehicleInput.value = state.project.meta.vehicle ?? '';
  els.revisionInput.value = state.project.meta.revision ?? '';
  els.authorInput.value = state.project.meta.author ?? AUTHOR;
}

function updateProjectMetaFromForm() {
  state.project.meta.name = els.projectNameInput.value;
  state.project.meta.vehicle = els.vehicleInput.value;
  state.project.meta.revision = els.revisionInput.value;
  state.project.meta.author = els.authorInput.value;
  touchProject();
  els.projectTitle.textContent = state.project.meta.name || APP_NAME;
  renderValidation();
}

function exportProjectJson() {
  downloadText(`${safeFileName(state.project.meta.name || APP_NAME)}.kwd.json`, serializeProject(state.project), 'application/json');
  flashStatus('Projektdatei exportiert.');
}

async function importProjectJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    state.project = parseProjectJson(text);
    state.selected = { type: 'project', id: null };
    state.pendingEndpoint = null;
    setWireMode(false, { renderAfterChange: false });
    flashStatus('Projekt erfolgreich geöffnet.');
    render();
  } catch (error) {
    flashStatus(`Import fehlgeschlagen: ${error.message}`);
  } finally {
    event.target.value = '';
  }
}

function exportWorkspaceSvg() {
  const clone = els.workspace.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const source = `<?xml version="1.0" encoding="UTF-8"?>\n${clone.outerHTML}`;
  downloadText(`${safeFileName(state.project.meta.name || APP_NAME)}.svg`, source, 'image/svg+xml');
  flashStatus('SVG-Datei exportiert.');
}

function downloadText(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function svgPoint(event) {
  const point = els.workspace.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(els.workspace.getScreenCTM().inverse());
}

function svg(name, attrs = {}, text = '') {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) element.setAttribute(key, String(value));
  }
  if (text) element.textContent = text;
  return element;
}

function cubicPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y
  };
}

function snap(value) {
  return Math.round(Number(value) / 10) * 10;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function safeFileName(name) {
  return String(name).trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || APP_NAME;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function touchProject() {
  state.project.meta.updatedAt = new Date().toISOString();
}

function flashStatus(message) {
  els.statusText.textContent = message;
  window.clearTimeout(flashStatus.timer);
  flashStatus.timer = window.setTimeout(() => {
    els.statusText.textContent = 'Bereit';
  }, 2800);
}
