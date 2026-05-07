import { initGraph, renderGraph, zoomToNode, initAllianceLayer, setAllianceData, toggleAllianceVisibility, setAllyHighlights, clearAllyHighlights, setRelationsData, showRelationArcs, toggleRelationType, highlightCountryRelations, clearRelationHighlights } from './render.js';
import { loadData } from './data-loader.js';
import { initSidePanel } from './side-panel/index.js';
import { state } from './store.js';
import { t, applyLang } from './i18n.js';
import { getFlagUrl } from './utils.js';
import { loadAlliances, getAlliancesByCountry, loadRelations, getRelationsByCountry } from './network.js';
import { setupTooltip } from './ui.js';

// ── ISO 3166-1 alpha-3 → alpha-2 ──
const CCA3_TO_CCA2 = {
  "ABW":"AW","AFG":"AF","AGO":"AO","AIA":"AI","ALA":"AX","ALB":"AL","AND":"AD",
  "ARE":"AE","ARG":"AR","ARM":"AM","ASM":"AS","ATA":"AQ","ATF":"TF","ATG":"AG",
  "AUS":"AU","AUT":"AT","AZE":"AZ","BDI":"BI","BEL":"BE","BEN":"BJ","BES":"BQ",
  "BFA":"BF","BGD":"BD","BGR":"BG","BHR":"BH","BHS":"BS","BIH":"BA","BLM":"BL",
  "BLR":"BY","BLZ":"BZ","BMU":"BM","BOL":"BO","BRA":"BR","BRB":"BB","BRN":"BN",
  "BTN":"BT","BVT":"BV","BWA":"BW","CAF":"CF","CAN":"CA","CCK":"CC","CHE":"CH",
  "CHL":"CL","CHN":"CN","CIV":"CI","CMR":"CM","COD":"CD","COG":"CG","COK":"CK",
  "COL":"CO","COM":"KM","CPV":"CV","CRI":"CR","CUB":"CU","CUW":"CW","CXR":"CX",
  "CYM":"KY","CYP":"CY","CZE":"CZ","DEU":"DE","DJI":"DJ","DMA":"DM","DNK":"DK",
  "DOM":"DO","DZA":"DZ","ECU":"EC","EGY":"EG","ERI":"ER","ESH":"EH","ESP":"ES",
  "EST":"EE","ETH":"ET","FIN":"FI","FJI":"FJ","FLK":"FK","FRA":"FR","FRO":"FO",
  "FSM":"FM","GAB":"GA","GBR":"GB","GEO":"GE","GGY":"GG","GHA":"GH","GIB":"GI",
  "GIN":"GN","GLP":"GP","GMB":"GM","GNB":"GW","GNQ":"GQ","GRC":"GR","GRD":"GD",
  "GRL":"GL","GTM":"GT","GUF":"GF","GUM":"GU","GUY":"GY","HKG":"HK","HMD":"HM",
  "HND":"HN","HRV":"HR","HTI":"HT","HUN":"HU","IDN":"ID","IMN":"IM","IND":"IN",
  "IOT":"IO","IRL":"IE","IRN":"IR","IRQ":"IQ","ISL":"IS","ISR":"IL","ITA":"IT",
  "JAM":"JM","JEY":"JE","JOR":"JO","JPN":"JP","KAZ":"KZ","KEN":"KE","KGZ":"KG",
  "KHM":"KH","KIR":"KI","KNA":"KN","KOR":"KR","KWT":"KW","LAO":"LA","LBN":"LB",
  "LBR":"LR","LBY":"LY","LCA":"LC","LIE":"LI","LKA":"LK","LSO":"LS","LTU":"LT",
  "LUX":"LU","LVA":"LV","MAC":"MO","MAF":"MF","MAR":"MA","MCO":"MC","MDA":"MD",
  "MDG":"MG","MDV":"MV","MEX":"MX","MHL":"MH","MKD":"MK","MLI":"ML","MLT":"MT",
  "MMR":"MM","MNE":"ME","MNG":"MN","MNP":"MP","MOZ":"MZ","MRT":"MR","MSR":"MS",
  "MTQ":"MQ","MUS":"MU","MWI":"MW","MYS":"MY","MYT":"YT","NAM":"NA","NCL":"NC",
  "NER":"NE","NFK":"NF","NGA":"NG","NIC":"NI","NIU":"NU","NLD":"NL","NOR":"NO",
  "NPL":"NP","NRU":"NR","NZL":"NZ","OMN":"OM","PAK":"PK","PAN":"PA","PCN":"PN",
  "PER":"PE","PHL":"PH","PLW":"PW","PNG":"PG","POL":"PL","PRI":"PR","PRK":"KP",
  "PRT":"PT","PRY":"PY","PSE":"PS","PYF":"PF","QAT":"QA","REU":"RE","ROU":"RO",
  "RUS":"RU","RWA":"RW","SAU":"SA","SDN":"SD","SEN":"SN","SGP":"SG","SGS":"GS",
  "SHN":"SH","SJM":"SJ","SLB":"SB","SLE":"SL","SLV":"SV","SMR":"SM","SOM":"SO",
  "SPM":"PM","SRB":"RS","SSD":"SS","STP":"ST","SUR":"SR","SVK":"SK","SVN":"SI",
  "SWE":"SE","SWZ":"SZ","SXM":"SX","SYC":"SC","SYR":"SY","TCA":"TC","TCD":"TD",
  "TGO":"TG","THA":"TH","TJK":"TJ","TKL":"TK","TKM":"TM","TLS":"TL","TON":"TO",
  "TTO":"TT","TUN":"TN","TUR":"TR","TUV":"TV","TWN":"TW","TZA":"TZ","UGA":"UG",
  "UKR":"UA","UMI":"UM","URY":"UY","USA":"US","UZB":"UZ","VAT":"VA","VCT":"VC",
  "VEN":"VE","VGB":"VG","VIR":"VI","VNM":"VN","VUT":"VU","WLF":"WF","WSM":"WS",
  "XKX":"XK","YEM":"YE","ZAF":"ZA","ZMB":"ZM","ZWE":"ZW"
};

const flagUrl = (cca3) => {
  const a2 = CCA3_TO_CCA2[cca3] || '';
  return a2 ? `https://flagcdn.com/w40/${a2.toLowerCase()}.png` : '';
};

// ── CCA2 ↔ CCA3 reverse map ──
const CCA2_TO_CCA3 = Object.fromEntries(
  Object.entries(CCA3_TO_CCA2).map(([k, v]) => [v, k])
);

// ── State ──
let allCountries    = [];
let filteredCountries = [];
let activeAlpha2    = null;
let allianceData    = null;
let relationsData   = null;

// ── DOM refs ──
const sidebarToggle     = document.getElementById('sidebarToggle');
const leftSidebar       = document.getElementById('leftSidebar');
const lsClose           = document.getElementById('lsClose');
const lsBackdrop        = document.getElementById('lsBackdrop');
const lsSearch          = document.getElementById('lsSearch');
const lsCountryList     = document.getElementById('lsCountryList');
const lsScenariosList   = document.getElementById('lsScenariosList');
const lsNationsBtn      = document.getElementById('lsNationsBtn');
const lsNationsContent  = document.getElementById('lsNationsContent');
const lsScenariosBtn    = document.getElementById('lsScenariosBtn');
const lsScenariosContent= document.getElementById('lsScenariosContent');

// ── Sidebar open / close ──
function openSidebar() {
  leftSidebar.classList.remove('ls-hidden');
  leftSidebar.removeAttribute('aria-hidden');
  lsBackdrop.classList.add('ls-visible');
  sidebarToggle.setAttribute('aria-expanded', 'true');
  document.body.classList.add('sidebar-open');
}

function closeSidebar() {
  leftSidebar.classList.add('ls-hidden');
  leftSidebar.setAttribute('aria-hidden', 'true');
  lsBackdrop.classList.remove('ls-visible');
  sidebarToggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('sidebar-open');
}

function toggleSection(btn, content) {
  const open = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!open));
  content.classList.toggle('ls-collapsed', open);
}

// Build entries for unrecognized states from world.json (no cca3 lookup, use node id directly)
function getUnrecognizedListEntries(filterText) {
  const q = (filterText || '').toLowerCase().trim();
  return state.nodes
    .filter(n => n.type === 'unrecognized')
    .filter(n => !q || (n.name || '').toLowerCase().includes(q) || (n.id || '').toLowerCase().includes(q))
    .map(n => ({
      id: n.id,                       // node id, used as alpha-2 in state
      nom_officiel: n.name || n.label || n.id,
      _unrecognized: true
    }))
    .sort((a, b) => (a.nom_officiel || '').localeCompare(b.nom_officiel || '', 'fr'));
}

// Inject a count badge into a section button (idempotent)
function setSectionCount(btn, count) {
  if (!btn) return;
  let badge = btn.querySelector('.ls-section-count');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'ls-section-count';
    // Place the badge before the chevron so the chevron stays at the far right
    const chev = btn.querySelector('.ls-chevron');
    if (chev) btn.insertBefore(badge, chev); else btn.appendChild(badge);
  }
  badge.textContent = String(count);
}

// ── Country list ──
function renderCountryList() {
  if (!lsCountryList) return;
  const unrecogEntries = getUnrecognizedListEntries(lsSearch?.value);
  // Drop countries.json entries whose alpha-2 is already covered by an unrecognized node
  // (so the entry from world.json — proper French label, italic styling — wins)
  const unrecogAlpha2 = new Set(unrecogEntries.map(e => e.id));
  const standard = filteredCountries.filter(c => !unrecogAlpha2.has((CCA3_TO_CCA2[c.id] || '').toUpperCase()));
  const all = [...standard, ...unrecogEntries];
  setSectionCount(lsNationsBtn, all.length);
  if (!all.length) {
    lsCountryList.innerHTML = '<div class="ls-empty">Aucun résultat</div>';
    return;
  }
  lsCountryList.innerHTML = all.map(c => {
    const isUnrecog = !!c._unrecognized;
    const a2     = isUnrecog ? c.id : (CCA3_TO_CCA2[c.id] || '').toUpperCase();
    const url    = isUnrecog ? getFlagUrl(c.id) : flagUrl(c.id);
    const active = a2 && a2 === activeAlpha2;
    const flag = url
      ? `<img class="ls-flag" src="${url}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : '<div class="ls-flag-ph"></div>';
    return `<div class="ls-country-item${active ? ' ls-active' : ''}${isUnrecog ? ' ls-unrecognized' : ''}" data-cca3="${c.id}" data-alpha2="${a2}">
      ${flag}
      <span class="ls-country-name">${c.nom_officiel || c.id}</span>
    </div>`;
  }).join('');

  lsCountryList.querySelectorAll('.ls-country-item').forEach(el => {
    el.addEventListener('click', () => {
      const a2 = el.dataset.alpha2;
      if (!a2) return;
      activeAlpha2  = a2;
      state.focusId = a2;
      state.infoId  = a2;
      renderGraph();
      zoomToNode(a2);
      window.dispatchEvent(new CustomEvent('stateUpdated'));
      lsCountryList.querySelectorAll('.ls-country-item').forEach(e => e.classList.remove('ls-active'));
      el.classList.add('ls-active');
    });
  });
}

// ── Scenarios list ──
function renderScenariosList(scenarios) {
  if (!lsScenariosList || !scenarios.length) return;
  setSectionCount(lsScenariosBtn, scenarios.length);

  const tops   = scenarios.filter(s => !s.includes(' - '));
  const groups = tops.map(top => ({
    label: top,
    children: scenarios
      .filter(s => s.startsWith(top + ' - '))
      .map(s => ({ label: s.replace(top + ' - ', ''), full: s }))
  }));

  const active = state.activeScenario;
  let html = `<div class="ls-scenario-item${!active ? ' ls-active' : ''}" data-scenario="">
    <span class="ls-scenario-dot"></span><span>${t('allRelations')}</span>
  </div>`;

  for (const g of groups) {
    html += `<div class="ls-scenario-item${active === g.label ? ' ls-active' : ''}" data-scenario="${g.label}">
      <span class="ls-scenario-dot"></span><span>${g.label}</span>
    </div>`;
    for (const child of g.children) {
      html += `<div class="ls-scenario-item ls-sub${active === child.full ? ' ls-active' : ''}" data-scenario="${child.full}">
        <span class="ls-scenario-dot"></span><span>${child.label}</span>
      </div>`;
    }
  }

  lsScenariosList.innerHTML = html;

  lsScenariosList.querySelectorAll('.ls-scenario-item').forEach(el => {
    el.addEventListener('click', () => {
      state.activeScenario = el.dataset.scenario || null;
      renderGraph();
      lsScenariosList.querySelectorAll('.ls-scenario-item').forEach(e => e.classList.remove('ls-active'));
      el.classList.add('ls-active');
    });
  });
}

// ── Comparison panel ──
function renderCountryCard(nodeId, cardEl) {
  if (!cardEl) return;
  const node = state.nodes.find(n => n.id === nodeId);
  if (!node) {
    cardEl.innerHTML = `<div class="compare-empty">${t('compareInstruction')}</div>`;
    return;
  }
  const flagSrc = node.code ? getFlagUrl(node.code) : '';
  const rows = [
    node.region   ? [t('region'),     node.region]   : null,
    node.regime   ? [t('regime'),     node.regime]   : null,
    node.population ? [t('population'), node.population] : null,
    node.gdp      ? [t('gdp'),        node.gdp]      : null,
  ].filter(Boolean);

  cardEl.innerHTML = `
    <div class="compare-card-header">
      ${flagSrc ? `<img class="compare-flag" src="${flagSrc}" alt="" onerror="this.style.display='none'">` : ''}
      <span class="compare-card-name">${node.name || node.id}</span>
    </div>
    ${rows.map(([label, val]) =>
      `<div class="compare-attr"><span>${label}</span><span>${val}</span></div>`
    ).join('')}
  `;
}

function renderComparePanel() {
  const panel = document.getElementById('comparePanel');
  const card0 = document.getElementById('compareCard0');
  const card1 = document.getElementById('compareCard1');
  if (!panel) return;

  if (!state.compareMode || state.compareIds.length === 0) {
    panel.setAttribute('hidden', '');
    return;
  }

  panel.removeAttribute('hidden');

  if (state.compareIds[0]) {
    renderCountryCard(state.compareIds[0], card0);
  } else {
    card0.innerHTML = `<div class="compare-empty">${t('compareInstruction')}</div>`;
  }

  if (state.compareIds[1]) {
    renderCountryCard(state.compareIds[1], card1);
  } else {
    card1.innerHTML = '';
  }
}

// ── Heatmap legend ──
function updateHeatmapLegend({ indicator, minV, maxV }) {
  const legend = document.getElementById('heatmapLegend');
  const title  = document.getElementById('heatmapTitle');
  const minEl  = document.getElementById('heatmapMin');
  const maxEl  = document.getElementById('heatmapMax');
  if (!legend) return;

  if (!indicator) {
    legend.setAttribute('hidden', '');
    return;
  }

  legend.removeAttribute('hidden');

  const labelMap = { gdp: t('heatmapGdp'), pop: t('heatmapPop'), conflict: t('heatmapConflict') };
  if (title) title.textContent = labelMap[indicator] || indicator;

  const fmt = (v) => {
    if (indicator === 'conflict') return String(Math.round(v));
    if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    return v.toFixed(0);
  };

  if (minEl) minEl.textContent = fmt(minV);
  if (maxEl) maxEl.textContent = fmt(maxV);
}

// ── Alliance panel ──
function setupAlliancePanel(data) {
  const panel = document.getElementById('alliancePanel');
  const list  = document.getElementById('alliancePanelList');
  if (!panel || !list) return;

  list.innerHTML = '';
  for (const a of data.alliances) {
    const row = document.createElement('label');
    row.className = 'alliance-checkbox-row';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.id = a.id;
    cb.addEventListener('change', () => {
      toggleAllianceVisibility(a.id, cb.checked);
    });

    const dot = document.createElement('span');
    dot.className = 'alliance-dot';
    dot.style.background = a.color;

    const lbl = document.createElement('span');
    lbl.className = 'alliance-label';
    lbl.textContent = a.label;

    row.append(cb, dot, lbl);
    list.appendChild(row);
  }

  panel.removeAttribute('hidden');
}

const REL_TYPES = [
  { id: 'ally',    label: 'Allié',      emoji: '🤝' },
  { id: 'partner', label: 'Partenaire', emoji: '🫱' },
  { id: 'neutral', label: 'Neutre',     emoji: '➖' },
  { id: 'rival',   label: 'Rival',      emoji: '⚡' },
  { id: 'conflict',label: 'Conflit',    emoji: '⚔️' },
];

function setupRelationsPanel() {
  const list = document.getElementById('alliancePanelList');
  if (!list) return;

  const divider = document.createElement('div');
  divider.className = 'alliance-panel-divider';
  list.appendChild(divider);

  const title = document.createElement('div');
  title.className = 'alliance-panel-title';
  title.textContent = 'Relations diplomatiques';
  list.appendChild(title);

  for (const rt of REL_TYPES) {
    const row = document.createElement('label');
    row.className = 'alliance-checkbox-row';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.reltype = rt.id;
    cb.addEventListener('change', () => {
      toggleRelationType(rt.id, cb.checked);
    });

    const emoji = document.createElement('span');
    emoji.className = 'alliance-rel-emoji';
    emoji.textContent = rt.emoji;

    const lbl = document.createElement('span');
    lbl.className = 'alliance-label';
    lbl.textContent = rt.label;

    row.append(cb, emoji, lbl);
    list.appendChild(row);
  }
}

function getCountryName(cca3) {
  const c = allCountries.find(x => x.id === cca3);
  return c ? (c.nom_officiel || cca3) : cca3;
}

function injectAllianceBadges(nodeId) {
  if (!allianceData || !nodeId) return;
  const cca3 = CCA2_TO_CCA3[nodeId];
  if (!cca3) return;

  // Remove stale badge section
  document.getElementById('sp-alliance-section')?.remove();

  const alliances = getAlliancesByCountry(cca3, allianceData);
  if (!alliances.length) return;

  const spBody = document.querySelector('.sp-body');
  if (!spBody) return;

  const section = document.createElement('div');
  section.id = 'sp-alliance-section';
  section.className = 'sp-section';
  section.innerHTML = `<div class="sp-section-title">Alliances</div>
    <div class="sp-alliance-badges">
      ${alliances.map(a =>
        `<span class="sp-alliance-badge" style="border-color:${a.color};color:${a.color};background:${a.color}1a">
          ${a.label}
        </span>`
      ).join('')}
    </div>`;
  spBody.appendChild(section);
}

function injectRelationBadges(nodeId) {
  document.getElementById('sp-relation-section')?.remove();
  if (!relationsData || !nodeId) return;
  const cca3 = CCA2_TO_CCA3[nodeId];
  if (!cca3) return;

  const rels = getRelationsByCountry(cca3, relationsData);
  if (!rels.length) return;

  const spBody = document.querySelector('.sp-body');
  if (!spBody) return;

  const REL_EMOJI = { ally:'🤝', partner:'🫱', neutral:'➖', rival:'⚡', conflict:'⚔️' };
  const REL_COLOR = {
    ally:'#4a90d9', partner:'#27ae60', neutral:'#95a5a6',
    rival:'#e67e22', conflict:'#e74c3c',
  };

  const section = document.createElement('div');
  section.id = 'sp-relation-section';
  section.className = 'sp-section';

  const rows = rels.map(r => {
    const cca2 = CCA3_TO_CCA2[r.partner] || '';
    const name = getCountryName(r.partner);
    const emoji = REL_EMOJI[r.type] || '➖';
    const color = REL_COLOR[r.type] || '#95a5a6';
    const flagSrc = cca2 ? `https://flagcdn.com/w20/${cca2.toLowerCase()}.png` : '';
    const clickable = cca2 ? `data-cca2="${cca2}"` : '';
    return `<div class="sp-rel-row${cca2 ? ' sp-rel-row--link' : ''}" ${clickable} style="--rel-color:${color}">
      ${flagSrc ? `<img class="sp-rel-flag" src="${flagSrc}" alt="" onerror="this.style.display='none'" loading="lazy">` : ''}
      <span class="sp-rel-emoji">${emoji}</span>
      <span class="sp-rel-name">${name}</span>
      <span class="sp-rel-badge" style="color:${color};border-color:${color}">${r.label}</span>
    </div>`;
  }).join('');

  section.innerHTML = `<div class="sp-section-title">Relations clés</div>
    <div class="sp-rel-list">${rows}</div>`;
  spBody.appendChild(section);

  section.querySelectorAll('.sp-rel-row--link').forEach(el => {
    el.addEventListener('click', () => {
      const cca2 = el.dataset.cca2;
      if (!cca2) return;
      activeAlpha2  = cca2;
      state.focusId = cca2;
      state.infoId  = cca2;
      renderGraph();
      zoomToNode(cca2);
      window.dispatchEvent(new CustomEvent('stateUpdated'));
    });
  });
}

function highlightAllies(nodeId) {
  if (!allianceData || !nodeId) {
    clearAllyHighlights();
    return;
  }
  const cca3 = CCA2_TO_CCA3[nodeId];
  if (!cca3) { clearAllyHighlights(); return; }

  const alliances = getAlliancesByCountry(cca3, allianceData);
  if (!alliances.length) { clearAllyHighlights(); return; }

  // Gather all allied CCA2 codes with their alliance colour
  const highlights = [];
  for (const a of alliances) {
    // hex → rgba for a subtle tint
    const r = parseInt(a.color.slice(1,3),16);
    const g = parseInt(a.color.slice(3,5),16);
    const b = parseInt(a.color.slice(5,7),16);
    const color = `rgba(${r},${g},${b},0.22)`;
    for (const cca3m of a.members) {
      if (cca3m === cca3) continue;
      const cca2 = CCA3_TO_CCA2[cca3m];
      if (cca2) highlights.push({ cca2, color });
    }
  }
  setAllyHighlights(highlights);
}

// ── Settings popup ──
function setupSettings() {
  const settingsBtn   = document.getElementById('settingsBtn');
  const settingsPopup = document.getElementById('settingsPopup');
  if (!settingsBtn || !settingsPopup) return;

  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsPopup.hasAttribute('hidden')
      ? settingsPopup.removeAttribute('hidden')
      : settingsPopup.setAttribute('hidden', '');
  });

  document.addEventListener('click', (e) => {
    if (!settingsPopup.contains(e.target) && e.target !== settingsBtn)
      settingsPopup.setAttribute('hidden', '');
  });

  document.getElementById('colorblindToggle')?.addEventListener('click', function() {
    state.colorblindMode = !state.colorblindMode;
    this.classList.toggle('active', state.colorblindMode);
    this.setAttribute('aria-checked', String(state.colorblindMode));
    renderGraph();
  });

  document.getElementById('lightToggle')?.addEventListener('click', function() {
    const on = document.body.classList.toggle('light-mode');
    this.classList.toggle('active', on);
    this.setAttribute('aria-checked', String(on));
  });

  // Compare mode toggle
  document.getElementById('compareToggle')?.addEventListener('click', function() {
    state.compareMode = !state.compareMode;
    state.compareIds  = [];
    this.classList.toggle('active', state.compareMode);
    this.setAttribute('aria-checked', String(state.compareMode));
    document.body.classList.toggle('compare-mode-active', state.compareMode);
    renderComparePanel();
  });

  // Language switch
  document.getElementById('langSwitch')?.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.lang = btn.dataset.lang;
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === state.lang));
      applyLang();
    });
  });

  // Heatmap indicator
  document.getElementById('heatmapSelect')?.addEventListener('change', function() {
    state.heatmapIndicator = this.value || null;
    renderGraph();
    if (!state.heatmapIndicator) {
      document.getElementById('heatmapLegend')?.setAttribute('hidden', '');
    }
  });

  document.getElementById('exportSvg')?.addEventListener('click', () => {
    const svgEl = document.getElementById('graph');
    const svgStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svgEl);
    Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' })),
      download: 'alliance-map.svg'
    }).click();
  });

  document.getElementById('exportPng')?.addEventListener('click', () => {
    const svgEl = document.getElementById('graph');
    const [w, h] = [svgEl.clientWidth, svgEl.clientHeight];
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svgEl)], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      [canvas.width, canvas.height] = [w, h];
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, w, h);
      try {
        ctx.drawImage(img, 0, 0);
        Object.assign(document.createElement('a'), {
          href: canvas.toDataURL('image/png'),
          download: 'alliance-map.png'
        }).click();
      } catch {
        alert('Export PNG : images cross-origin bloquées. Utilisez Export SVG.');
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

  document.getElementById('copyLink')?.addEventListener('click', async function() {
    await navigator.clipboard.writeText(window.location.href);
    const orig = this.textContent;
    this.textContent = t('copied');
    setTimeout(() => { this.textContent = orig; }, 2000);
  });
}

// ── Timeline slider ──
function setupTimeline() {
  const slider  = document.getElementById('timelineSlider');
  const yearEl  = document.getElementById('timelineYear');
  if (!slider) return;

  slider.addEventListener('input', () => {
    state.currentYear = Number(slider.value);
    if (yearEl) yearEl.textContent = slider.value;
    renderGraph();
  });
}

// ── Init ──
async function init() {
  setupSettings();
  setupTimeline();
  setupTooltip();

  sidebarToggle?.addEventListener('click', openSidebar);
  lsClose?.addEventListener('click', closeSidebar);
  lsBackdrop?.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSidebar(); });

  lsNationsBtn?.addEventListener('click', () => toggleSection(lsNationsBtn, lsNationsContent));
  lsScenariosBtn?.addEventListener('click', () => toggleSection(lsScenariosBtn, lsScenariosContent));

  lsSearch?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    filteredCountries = q
      ? allCountries.filter(c =>
          (c.nom_officiel || '').toLowerCase().includes(q) ||
          (c.capitale || '').toLowerCase().includes(q))
      : [...allCountries];
    renderCountryList();
  });

  // Close compare panel
  document.getElementById('compareClose')?.addEventListener('click', () => {
    state.compareMode = false;
    state.compareIds  = [];
    document.body.classList.remove('compare-mode-active');
    document.getElementById('comparePanel')?.setAttribute('hidden', '');
    const toggle = document.getElementById('compareToggle');
    if (toggle) { toggle.classList.remove('active'); toggle.setAttribute('aria-checked', 'false'); }
  });

  // Events from render.js
  window.addEventListener('compareUpdated', renderComparePanel);
  window.addEventListener('heatmapComputed', (e) => updateHeatmapLegend(e.detail));

  // initSidePanel first so its stateUpdated listener fires BEFORE ours,
  // ensuring the panel DOM is fully rendered when we inject badges.
  initSidePanel({
    onCenter: (node) => zoomToNode(node.id),
    onClose:  () => {
      clearAllyHighlights();
      clearRelationHighlights();
      document.getElementById('sp-alliance-section')?.remove();
      document.getElementById('sp-relation-section')?.remove();
      renderGraph();
    },
  });

  // Sync highlights + side-panel badges on every country select
  // Registered AFTER initSidePanel so the panel is already rendered when we append.
  window.addEventListener('stateUpdated', () => {
    const id = state.infoId;
    const cca3 = id ? CCA2_TO_CCA3[id] : null;
    injectAllianceBadges(id);
    injectRelationBadges(id);
    highlightAllies(id);
    highlightCountryRelations(cca3 || null, relationsData);
  });

  initGraph();
  // Pass CCA3→CCA2 map to render.js so it can resolve hover CCA3
  initAllianceLayer(CCA3_TO_CCA2);

  const [worldData, rawCountries] = await Promise.all([
    loadData(),
    fetch('./data/countries.json')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .catch(err => { console.error('Erreur countries.json:', err); return null; })
  ]);

  if (worldData) {
    renderGraph();
    const scenarios = [...new Set(state.links.map(l => l.scenario).filter(Boolean))];
    renderScenariosList(scenarios);
  }

  // Lazy-load alliances then relations (non-blocking)
  loadAlliances().then(data => {
    if (!data) return;
    allianceData = data;
    setAllianceData(data);
    setupAlliancePanel(data);
    // Relations are loaded after alliances so capitals dict is available
    return loadRelations();
  }).then(data => {
    if (!data) return;
    relationsData = data;
    setRelationsData(data);
    setupRelationsPanel();
  });

  if (rawCountries) {
    allCountries = rawCountries.sort((a, b) =>
      (a.nom_officiel || '').localeCompare(b.nom_officiel || '', 'fr'));
    filteredCountries = [...allCountries];
    renderCountryList();
  }

  applyLang();
}

document.addEventListener('DOMContentLoaded', init);
