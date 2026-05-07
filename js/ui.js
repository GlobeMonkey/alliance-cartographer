import { state, RELATION_TYPES, saveStateToHistory, getVisibleGraph, getNeighborLinks } from './store.js';
import { parsePowerMetric, getFlagUrl } from './utils.js';

export function syncSidebarState() {
  document.body.classList.toggle("sidebar-collapsed", !state.sidebarOpen);
  const button = document.getElementById("sidebarToggleBtn");
  if (button) {
    // Keep icon only — toggle the icon direction based on sidebar state
    button.setAttribute("aria-label", state.sidebarOpen ? "Masquer panneau" : "Afficher panneau");
    button.innerHTML = state.sidebarOpen
      ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
        </svg>`
      : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3"></rect>
          <line x1="15" y1="3" x2="15" y2="21"></line>
        </svg>`;
  }
}

export function syncTheme() {
  document.body.classList.toggle("light", !state.darkMode);
  const icon = document.getElementById("themeIcon");
  if (icon) icon.textContent = state.darkMode ? "☀" : "☾";
}

export function syncControls() {
  const slider = document.getElementById("yearSlider");
  const yearValue = document.getElementById("yearValue");
  if (slider) slider.value = state.currentYear;
  if (yearValue) yearValue.textContent = state.currentYear;
}

export function populateLegend() {
  const legend = document.getElementById("legend");
  if (!legend) return;
  legend.innerHTML = "";
  Object.entries(RELATION_TYPES).forEach(([key, config]) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `
      <div class="swatch"></div>
      <span class="small">${config.label}</span>
    `;
    const swatch = item.querySelector(".swatch");
    // Determine color from state inside a getter if needed, but here we can just use store logic
    swatch.style.borderTop = `4px solid ${config.color}`; // we can update this in render if needed
    if (config.dash !== "0") {
      swatch.style.borderTopStyle = "dashed";
    }
    legend.appendChild(item);
  });
}

export function populateFilters(renderCallback) {
  const container = document.getElementById("dynamicFilters");
  if (!container) return;
  container.innerHTML = "";
  Object.entries(RELATION_TYPES).forEach(([key, value]) => {
    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "6px";
    label.style.cursor = "pointer";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = state.filterTypes.includes(key);
    checkbox.style.width = "auto";
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        if (!state.filterTypes.includes(key)) state.filterTypes.push(key);
      } else {
        state.filterTypes = state.filterTypes.filter(t => t !== key);
      }
      renderCallback();
      window.dispatchEvent(new CustomEvent('stateUpdated'));
    });
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(value.label));
    container.appendChild(label);
  });
}

export function populateScenarios(renderCallback) {
  const container = document.getElementById("scenarioFilter");
  if (!container) return;

  const allScenarios = [...new Set(state.links.map(l => l.scenario).filter(Boolean))].sort();
  container.innerHTML = "";

  // Group scenarios by parent category (before first ' - ')
  const groups = {};
  allScenarios.forEach(scen => {
    const dashIdx = scen.indexOf(' - ');
    const parent = dashIdx > -1 ? scen.substring(0, dashIdx) : scen;
    if (!groups[parent]) groups[parent] = [];
    groups[parent].push(scen);
  });

  Object.entries(groups).forEach(([groupName, scenarios]) => {
    // If group has sub-items AND itself is a scenario, show parent chip
    if (scenarios.length > 1) {
      // Parent header chip
      const header = document.createElement('div');
      header.className = 'scenario-group-label';
      header.textContent = groupName;
      container.appendChild(header);

      // Sub-chips
      const subRow = document.createElement('div');
      subRow.className = 'scenario-subchips';
      scenarios.forEach(scen => {
        const chip = makeChip(scen, scen === groupName ? groupName : scen.replace(groupName + ' - ', ''), renderCallback);
        subRow.appendChild(chip);
      });
      container.appendChild(subRow);
    } else {
      const chip = makeChip(scenarios[0], groupName, renderCallback);
      container.appendChild(chip);
    }
  });
}

function makeChip(scen, label, renderCallback) {
  const chip = document.createElement("button");
  chip.className = "scenario-chip" + (state.activeScenario === scen ? " is-active" : "");
  chip.textContent = label;
  chip.title = scen;
  chip.onclick = () => {
    state.activeScenario = state.activeScenario === scen ? null : scen;
    populateScenarios(renderCallback);
    renderCallback();
    window.dispatchEvent(new CustomEvent('stateUpdated'));
  };
  return chip;
}

export function populateSelects() {
  const source = document.getElementById("relationSource");
  const target = document.getElementById("relationTarget");
  const typeSelect = document.getElementById("relationType");
  if (!source || !target || !typeSelect) return;

  source.innerHTML = "";
  target.innerHTML = "";
  typeSelect.innerHTML = "";

  const sortedNodes = [...state.nodes].sort((a, b) => a.name.localeCompare(b.name));
  sortedNodes.forEach(n => {
    const optS = document.createElement("option");
    optS.value = n.id; optS.textContent = n.name;
    source.appendChild(optS);
    const optT = document.createElement("option");
    optT.value = n.id; optT.textContent = n.name;
    target.appendChild(optT);
  });

  Object.entries(RELATION_TYPES).forEach(([key, value]) => {
    const option = document.createElement("option");
    option.value = key; option.textContent = value.label;
    typeSelect.appendChild(option);
  });
}

export function renderStats() {
  const stats = document.getElementById("stats");
  if (!stats) return;
  const visible = getVisibleGraph();
  
  const degreeCount = new Map();
  visible.links.forEach((link) => {
    const sId = typeof link.source === "object" ? link.source.id : link.source;
    const tId = typeof link.target === "object" ? link.target.id : link.target;
    degreeCount.set(sId, (degreeCount.get(sId) || 0) + link.intensity);
    degreeCount.set(tId, (degreeCount.get(tId) || 0) + link.intensity);
  });

  const sorted = Array.from(degreeCount.entries())
    .map(([id, score]) => ({ id, score, node: visible.nodeMap.get(id) }))
    .filter((entry) => entry.node)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  stats.innerHTML = sorted.map((s, i) => `
    <div class="stat-row">
      <span class="small">${i + 1}. ${s.node.name}</span>
      <span class="small">Score: ${s.score}</span>
    </div>
  `).join("") || '<div class="empty">Pas de données</div>';
}

export function renderFocusPanel() {
  const panel = document.getElementById("focusPanel");
  if (!panel) return;
  if (!state.focusId) {
    panel.innerHTML = '<div class="empty">Clique sur un pays pour isoler ses relations.</div>';
    return;
  }
  const visible = getVisibleGraph();
  const node = visible.nodeMap.get(state.focusId);
  if (!node) return;

  const nLinks = getNeighborLinks(state.focusId, visible.links).sort((a, b) => b.intensity - a.intensity);
  
  let html = `<div><strong>${node.name}</strong></div>`;
  if (nLinks.length === 0) {
    html += '<div class="empty" style="margin-top:8px">Aucune relation à cette date.</div>';
  } else {
    html += '<div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">';
    nLinks.forEach((l) => {
      const sId = typeof l.source === "object" ? l.source.id : l.source;
      const tId = typeof l.target === "object" ? l.target.id : l.target;
      const targetNode = sId === state.focusId ? visible.nodeMap.get(tId) : visible.nodeMap.get(sId);
      if (targetNode) {
        html += `
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:4px 6px; border-radius:4px;">
            <span class="small">${targetNode.name}</span>
            <span class="badge">${RELATION_TYPES[l.type] ? RELATION_TYPES[l.type].label : l.type} (Force ${l.intensity})</span>
          </div>
        `;
      }
    });
    html += '</div>';
  }
  panel.innerHTML = html;
}

export function renderInfoPanel() {
  const panel = document.getElementById("infoPanel");
  if (!panel) return;
  if (!state.infoId) {
    panel.classList.add("empty");
    return;
  }

  // Close sidebar to give room for the floating card
  state.sidebarOpen = false;
  syncSidebarState();

  const node = state.nodes.find(n => n.id === state.infoId);
  if (!node) return;

  panel.classList.remove("empty");
  const powerScore = parsePowerMetric(node.population, node.gdp);
  const displayName = node.name || node.label || node.id;
  const isUnrecognized = node.type === 'unrecognized';

  panel.innerHTML = `
    <button class="floating-panel-close" id="closeInfoPanelBtn" aria-label="Fermer la fiche">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
    <div class="info-card" style="margin-top:8px;">
      <header>
        <div style="flex:1;">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <strong style="font-size:1.05rem;">${displayName}</strong>
            ${isUnrecognized ? '<span style="font-size:0.7rem; padding:2px 7px; border-radius:999px; background:rgba(255,200,50,0.15); border:1px solid rgba(255,200,50,0.4); color:rgba(255,200,50,0.9);">Non reconnu</span>' : ''}
          </div>
          <div class="small" style="margin-top:2px;">${node.code || 'Code non standard'}</div>
        </div>
        ${node.code && node.code.length === 2 ? `<img src="${getFlagUrl(node.code)}" alt="Drapeau ${displayName}" width="42" height="31" style="border-radius:8px; object-fit:cover; border:1px solid var(--border); ${isUnrecognized ? 'filter:grayscale(0.4);' : ''}">` : ''}
      </header>
      <div class="small" style="margin-top:4px;">Région: ${node.region || 'N/A'}</div>
      <div class="small">Régime: ${node.regime || 'N/A'}</div>
      <div class="small">Population: ${node.population || 'N/A'}</div>
      <div class="small">PIB nominal: ${node.gdp || 'N/A'}</div>
      
      <div class="small" style="margin-top:10px; display:flex; justify-content:space-between;">
        <span>Indicateur de puissance</span>
        <span>${powerScore}/100</span>
      </div>
      <div style="background: rgba(255,255,255,0.1); border-radius: 4px; height: 6px; margin-top: 4px; overflow: hidden; border: 1px solid var(--border);">
        <div style="background: var(--accent-2); width: ${powerScore}%; height: 100%; transition: width 0.4s ease;"></div>
      </div>
    </div>
  `;

  document.getElementById("closeInfoPanelBtn").addEventListener("click", () => {
    state.infoId = null;
    state.focusId = null;
    panel.classList.add("empty");
    window.dispatchEvent(new CustomEvent('stateUpdated'));
  });
}

export function setupTooltip() {
  const tooltip = d3.select("#tooltip");
  if (tooltip.empty()) return;
  window.addEventListener('tooltipShow', (e) => {
    const { node, links, event } = e.detail;
    const nLinks = getNeighborLinks(node.id, links);
    const html = `<div class="map-tooltip-name">${node.name}</div>
      <div class="map-tooltip-meta">${nLinks.length} relation${nLinks.length === 1 ? '' : 's'} visible${nLinks.length === 1 ? '' : 's'}</div>`;
    tooltip.html(html)
      .classed("visible", true)
      .style("left", `${event.offsetX + 16}px`)
      .style("top", `${event.offsetY + 16}px`);
  });
  window.addEventListener('tooltipMove', (e) => {
    const { event } = e.detail;
    tooltip.style("left", `${event.offsetX + 16}px`)
      .style("top", `${event.offsetY + 16}px`);
  });
  window.addEventListener('tooltipHide', () => {
    tooltip.classed("visible", false);
  });
}
