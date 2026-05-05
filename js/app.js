import { initGraph, renderGraph, zoomToNode } from './render.js';
import { loadData } from './data-loader.js';
import { initSidePanel } from './side-panel/index.js';
import { state } from './store.js';

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

// ── State ──
let allCountries    = [];
let filteredCountries = [];
let activeAlpha2    = null;

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
}

function closeSidebar() {
  leftSidebar.classList.add('ls-hidden');
  leftSidebar.setAttribute('aria-hidden', 'true');
  lsBackdrop.classList.remove('ls-visible');
  sidebarToggle.setAttribute('aria-expanded', 'false');
}

function toggleSection(btn, content) {
  const open = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!open));
  content.classList.toggle('ls-collapsed', open);
}

// ── Country list ──
function renderCountryList() {
  if (!lsCountryList) return;
  if (!filteredCountries.length) {
    lsCountryList.innerHTML = '<div class="ls-empty">Aucun résultat</div>';
    return;
  }
  lsCountryList.innerHTML = filteredCountries.map(c => {
    const url    = flagUrl(c.id);
    const a2     = (CCA3_TO_CCA2[c.id] || '').toUpperCase();
    const active = a2 && a2 === activeAlpha2;
    return `<div class="ls-country-item${active ? ' ls-active' : ''}" data-cca3="${c.id}" data-alpha2="${a2}">
      ${url
        ? `<img class="ls-flag" src="${url}" alt="" loading="lazy" onerror="this.style.display='none'">`
        : '<div class="ls-flag-ph"></div>'}
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

  const tops   = scenarios.filter(s => !s.includes(' - '));
  const groups = tops.map(t => ({
    label: t,
    children: scenarios
      .filter(s => s.startsWith(t + ' - '))
      .map(s => ({ label: s.replace(t + ' - ', ''), full: s }))
  }));

  const active = state.activeScenario;
  let html = `<div class="ls-scenario-item${!active ? ' ls-active' : ''}" data-scenario="">
    <span class="ls-scenario-dot"></span><span>Toutes les relations</span>
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
    this.textContent = 'Copié !';
    setTimeout(() => { this.textContent = orig; }, 2000);
  });
}

// ── Init ──
async function init() {
  setupSettings();
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

  initSidePanel({
    onCenter: (node) => zoomToNode(node.id),
    onClose:  () => renderGraph(),
  });

  initGraph();

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

  if (rawCountries) {
    allCountries = rawCountries.sort((a, b) =>
      (a.nom_officiel || '').localeCompare(b.nom_officiel || '', 'fr'));
    filteredCountries = [...allCountries];
    renderCountryList();
  }
}

document.addEventListener('DOMContentLoaded', init);
