import { makeId, clamp, normalizeCode } from './utils.js';

export const state = {
  nodes: [],
  links: [],
  focusId: null,
  infoId: null,
  currentYear: 2026,
  activeScenario: null,
  darkMode: true,
  colorblindMode: false,
  filterTypes: [],
  transform: null,
  sidebarOpen: false,
  editMode: new URLSearchParams(window.location.search).get('edit') === 'true',
  lang: 'fr',
  compareMode: false,
  compareIds: [],
  heatmapIndicator: null,
};

export const DALTONIAN_COLORS = {
  alliance: "#0072B2", // Bleu
  partnership: "#56B4E9", // Bleu clair
  neutral: "#F0E442", // Jaune
  rivalry: "#E69F00", // Orange
  conflict: "#D55E00" // Vermillon
};

export let RELATION_TYPES = {};

export function setRelationTypes(types) {
  RELATION_TYPES = types;
  if (state.filterTypes.length === 0) {
    state.filterTypes = Object.keys(types);
  }
}

export function getColor(type) {
  if (state.colorblindMode && DALTONIAN_COLORS[type]) {
    return DALTONIAN_COLORS[type];
  }
  return RELATION_TYPES[type] ? RELATION_TYPES[type].color : "#999";
}

let stateHistory = [];
let redoStack = [];

export function sanitizeNode(raw, reference = {}) {
  const id = raw.id || normalizeCode(raw.code);
  // code ISO alpha-2 = id si 2 lettres, sinon champ code explicite
  const code = (id && id.length === 2) ? id.toUpperCase() : (raw.code ? normalizeCode(raw.code) : null);
  const name = String(raw.label || raw.name || id || "Entité sans nom").trim();
  return {
    id: id || makeId("node"),
    name,
    label: name,
    code,
    lon: Number.isFinite(Number(raw.lon)) ? Number(raw.lon) : (reference.lon ?? 0),
    lat: Number.isFinite(Number(raw.lat)) ? Number(raw.lat) : (reference.lat ?? 0),
    x: raw.x,
    y: raw.y,
    region: raw.region,
    regime: raw.regime,
    population: raw.population,
    gdp: raw.gdp,
    type: raw.type || "country"
  };
}

export function sanitizeLink(raw) {
  const type = RELATION_TYPES[raw.type] ? raw.type : "neutral";
  return {
    id: raw.id || makeId("link"),
    source: typeof raw.source === "object" ? raw.source.id : raw.source,
    target: typeof raw.target === "object" ? raw.target.id : raw.target,
    type,
    intensity: clamp(Number(raw.intensity || raw.strength) || 1, 1, 5),
    startYear: Number.isFinite(Number(raw.startYear || raw.since)) ? Number(raw.startYear || raw.since) : 1945,
    endYear: Number.isFinite(Number(raw.endYear || raw.until)) ? Number(raw.endYear || raw.until) : 2035,
    scenario: raw.scenario || null
  };
}

export function exportState() {
  return {
    nodes: state.nodes.map(({ id, name, code, lon, lat, x, y, region, regime, population, gdp }) => ({ id, name, code, lon, lat, x, y, region, regime, population, gdp })),
    links: state.links.map((link) => ({
      id: link.id,
      source: typeof link.source === "object" ? link.source.id : link.source,
      target: typeof link.target === "object" ? link.target.id : link.target,
      type: link.type,
      intensity: link.intensity,
      startYear: link.startYear,
      endYear: link.endYear
    })),
    focusId: state.focusId,
    infoId: state.infoId,
    activeScenario: state.activeScenario,
    currentYear: state.currentYear,
    darkMode: state.darkMode,
    colorblindMode: state.colorblindMode,
    filterTypes: state.filterTypes,
    sidebarOpen: state.sidebarOpen
  };
}

export function importState(payload) {
  if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.links)) return false;
  state.nodes = payload.nodes.map(n => sanitizeNode(n, n));
  state.links = payload.links.map(sanitizeLink);
  state.focusId = payload.focusId || null;
  state.infoId = payload.infoId || null;
  state.activeScenario = payload.activeScenario || null;
  state.currentYear = clamp(Number(payload.currentYear) || 2026, 1945, 2026);
  state.darkMode = payload.darkMode !== false;
  state.colorblindMode = payload.colorblindMode === true;
  state.filterTypes = payload.filterTypes || Object.keys(RELATION_TYPES);
  state.sidebarOpen = payload.sidebarOpen !== false;
  
  if (state.editMode) {
    localStorage.setItem('alliance-map-draft', JSON.stringify(exportState()));
  }
  return true;
}

export function loadDraftIfAny() {
  if (!state.editMode) return false;
  const draft = localStorage.getItem('alliance-map-draft');
  if (draft) {
    try {
      const payload = JSON.parse(draft);
      return importState(payload);
    } catch (e) {
      console.warn('Draft invalide', e);
      return false;
    }
  }
  return false;
}

export function saveStateToHistory() {
  if (!state.editMode) return;
  stateHistory.push(JSON.stringify(exportState()));
  if (stateHistory.length > 50) stateHistory.shift();
  redoStack = []; // Clear redo stack on new action
  localStorage.setItem('alliance-map-draft', JSON.stringify(exportState()));
  window.dispatchEvent(new CustomEvent('historyChanged'));
}

export function undoAction() {
  if (stateHistory.length === 0) return;
  redoStack.push(JSON.stringify(exportState()));
  const prev = JSON.parse(stateHistory.pop());
  importState(prev);
  window.dispatchEvent(new CustomEvent('historyChanged'));
  window.dispatchEvent(new CustomEvent('stateUpdated'));
}

export function redoAction() {
  if (redoStack.length === 0) return;
  stateHistory.push(JSON.stringify(exportState()));
  const next = JSON.parse(redoStack.pop());
  importState(next);
  window.dispatchEvent(new CustomEvent('historyChanged'));
  window.dispatchEvent(new CustomEvent('stateUpdated'));
}

export function getHistoryLength() {
  return stateHistory.length;
}

export function getRedoLength() {
  return redoStack.length;
}

export function getVisibleGraph() {
  const visibleLinks = state.links.filter(link => 
    state.currentYear >= link.startYear && 
    state.currentYear <= link.endYear && 
    state.filterTypes.includes(link.type)
  );

  let finalLinks = [];
  if (state.activeScenario) {
    finalLinks = visibleLinks.filter(l => l.scenario === state.activeScenario);
  } else if (state.focusId) {
    finalLinks = visibleLinks.filter(l => {
      const sId = typeof l.source === "object" ? l.source.id : l.source;
      const tId = typeof l.target === "object" ? l.target.id : l.target;
      return sId === state.focusId || tId === state.focusId;
    });
  }

  return { nodes: state.nodes, links: finalLinks, nodeMap: new Map(state.nodes.map((n) => [n.id, n])) };
}

export function getNeighborLinks(nodeId, links) {
  return links.filter((l) => {
    const sId = typeof l.source === "object" ? l.source.id : l.source;
    const tId = typeof l.target === "object" ? l.target.id : l.target;
    return sId === nodeId || tId === nodeId;
  });
}
