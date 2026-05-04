/**
 * countries.js
 * ─────────────────────────────────────────────────────────────
 * Autonomous module that manages the "Countries" view:
 *   • Loads data/countries.json once (cached)
 *   • Renders a searchable card grid
 *   • Opens a rich detail panel on card click
 *   • Integrates with the existing #infoPanel floating panel
 *
 * Public API
 *   initCountriesView()  – call once from app.js bootstrap
 *   showCountriesView()  – activate the view
 *   hideCountriesView()  – deactivate the view
 * ─────────────────────────────────────────────────────────────
 */

// ── State ─────────────────────────────────────────────────────
let _allCountries = [];          // full dataset
let _filtered    = [];           // currently displayed subset
let _selected    = null;         // currently open country object
let _loaded      = false;

// ── DOM refs (set after initCountriesView) ────────────────────
let _shell, _searchInput, _grid, _panel, _panelInner;

// ── Formatters ────────────────────────────────────────────────
const fmt = {
  num:  (n, dec = 0) => n == null ? '—' : Number(n).toLocaleString('fr-FR', { maximumFractionDigits: dec }),
  pct:  (n)          => n == null ? '—' : `${Number(n).toFixed(2)} %`,
  bn:   (n)          => {
    if (n == null) return '—';
    if (n >= 1e12) return `${(n / 1e12).toFixed(2)} T$`;
    if (n >= 1e9)  return `${(n / 1e9).toFixed(1)} Md$`;
    if (n >= 1e6)  return `${(n / 1e6).toFixed(1)} M$`;
    return `${Number(n).toLocaleString('fr-FR')} $`;
  },
};

// ── Flag helper ───────────────────────────────────────────────
function flagUrl(country) {
  // cca2 is stripped before save; rebuild from id (cca3) via restcountries flag CDN
  // We stored cca3 as id. Use flagcdn with cca2 approach → fallback to emoji/placeholder
  // Best effort: use the country name initials as fallback
  return `https://flagcdn.com/w80/${(country.cca2 || '').toLowerCase()}.png`;
}

// cca2 was removed before saving; derive from country object's id (cca3)
// We keep a static lookup as best-effort for flag display
function countryFlagImg(c) {
  // Try to get a flag via the country's official name first letter as last resort
  const iso2 = c.cca2 || '';
  if (!iso2) {
    return `<div class="country-flag-placeholder">${(c.nom_officiel || '?').slice(0, 2).toUpperCase()}</div>`;
  }
  return `<img class="country-flag" src="https://flagcdn.com/w80/${iso2.toLowerCase()}.png"
              alt="${c.nom_officiel}" loading="lazy"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="country-flag-placeholder" style="display:none">${(c.nom_officiel || '?').slice(0, 2).toUpperCase()}</div>`;
}

// ── Region colour accent ──────────────────────────────────────
const REGION_COLORS = {
  'Western Europe':       '#5fc4ff',
  'Northern Europe':      '#4fd1c5',
  'Southern Europe':      '#f6ad55',
  'Eastern Europe':       '#fc8181',
  'North America':        '#68d391',
  'Central America':      '#48bb78',
  'Caribbean':            '#76e4f7',
  'South America':        '#f6e05e',
  'Northern Africa':      '#fbd38d',
  'Western Africa':       '#f6ad55',
  'Eastern Africa':       '#fc8181',
  'Central Africa':       '#b794f4',
  'Southern Africa':      '#e9d8fd',
  'Middle East':          '#fbb6ce',
  'Central Asia':         '#9f7aea',
  'Eastern Asia':         '#ff6b6b',
  'South-Eastern Asia':   '#f687b3',
  'Southern Asia':        '#fcd34d',
  'Melanesia':            '#6ee7b7',
  'Micronesia':           '#a5f3fc',
  'Polynesia':            '#c7d2fe',
  'Australia and New Zealand': '#93c5fd',
};
function regionColor(region) {
  return REGION_COLORS[region] || 'var(--accent)';
}

// ── GDP per capita → wealth tier ──────────────────────────────
function wealthTier(gdpHab) {
  if (gdpHab == null) return { label: 'N/D', cls: 'tier-na' };
  if (gdpHab >= 40000) return { label: 'Élevé', cls: 'tier-high' };
  if (gdpHab >= 12000) return { label: 'Moyen+', cls: 'tier-mid-high' };
  if (gdpHab >= 4000)  return { label: 'Moyen', cls: 'tier-mid' };
  return { label: 'Faible', cls: 'tier-low' };
}

// ── Card HTML ─────────────────────────────────────────────────
function buildCard(c) {
  const tier = wealthTier(c.pib_par_hab);
  const color = regionColor(c.region);
  const mil = c.dep_militaire_pct_pib;
  const milBar = mil != null ? Math.min(mil / 6, 1) * 100 : 0; // scale 0–6% → 0–100%

  return `
<article class="country-card" data-id="${c.id}" tabindex="0" role="button"
         aria-label="Voir la fiche de ${c.nom_officiel}">
  <div class="cc-accent-line" style="background:${color}"></div>
  <div class="cc-header">
    <div class="cc-flag-wrap">
      ${countryFlagImg(c)}
    </div>
    <div class="cc-title-wrap">
      <h3 class="cc-name">${c.nom_officiel}</h3>
      <span class="cc-capital">${c.capitale || '—'}</span>
    </div>
    <span class="cc-tier ${tier.cls}">${tier.label}</span>
  </div>
  <div class="cc-region" style="color:${color}">
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="5"/></svg>
    ${c.region || '—'}
  </div>
  <div class="cc-stats">
    <div class="cc-stat">
      <span class="cc-stat-label">Population</span>
      <span class="cc-stat-value">${fmt.num(c.population)}</span>
    </div>
    <div class="cc-stat">
      <span class="cc-stat-label">PIB/hab</span>
      <span class="cc-stat-value">${c.pib_par_hab != null ? '$' + fmt.num(c.pib_par_hab) : '—'}</span>
    </div>
  </div>
  ${mil != null ? `
  <div class="cc-mil-wrap">
    <span class="cc-mil-label">Déf. ${fmt.pct(mil)} PIB</span>
    <div class="cc-mil-bar-track"><div class="cc-mil-bar" style="width:${milBar}%"></div></div>
  </div>` : ''}
</article>`;
}

// ── Detail panel HTML ─────────────────────────────────────────
function buildDetail(c) {
  const color = regionColor(c.region);
  const tier  = wealthTier(c.pib_par_hab);
  const growth = c.croissance_pct;
  const growthSign = growth != null ? (growth >= 0 ? '+' : '') : '';
  const growthColor = growth == null ? 'var(--muted)' : growth >= 0 ? 'var(--success)' : 'var(--danger)';

  const borders = (c.frontieres || []);
  const bordersHtml = borders.length
    ? borders.map(b => `<span class="dp-border-chip">${b}</span>`).join('')
    : '<span class="dp-none">Aucune frontière terrestre</span>';

  const langues = (c.langues || []).join(', ') || '—';

  return `
<div class="dp-header" style="--region-color:${color}">
  <div class="dp-flag-wrap">
    ${countryFlagImg(c)}
  </div>
  <div class="dp-title-wrap">
    <h2 class="dp-name">${c.nom_officiel}</h2>
    <div class="dp-meta">
      <span class="dp-region" style="color:${color}">${c.region || '—'}</span>
      <span class="dp-tier ${tier.cls}">${tier.label}</span>
    </div>
  </div>
</div>

<div class="dp-grid">

  <div class="dp-block">
    <span class="dp-block-label">Capitale</span>
    <span class="dp-block-value">${c.capitale || '—'}</span>
  </div>

  <div class="dp-block">
    <span class="dp-block-label">Superficie</span>
    <span class="dp-block-value">${c.superficie_km2 != null ? fmt.num(c.superficie_km2) + ' km²' : '—'}</span>
  </div>

  <div class="dp-block">
    <span class="dp-block-label">Population</span>
    <span class="dp-block-value">${fmt.num(c.population)}</span>
  </div>

  <div class="dp-block">
    <span class="dp-block-label">Accès mer</span>
    <span class="dp-block-value">${c.acces_mer ? '🌊 Oui' : '🏔 Non (enclavé)'}</span>
  </div>

  <div class="dp-block dp-block--wide">
    <span class="dp-block-label">Langues officielles</span>
    <span class="dp-block-value">${langues}</span>
  </div>

</div>

<div class="dp-section-title">Économie</div>
<div class="dp-econ-grid">
  <div class="dp-econ-card">
    <span class="dp-econ-label">PIB Total</span>
    <span class="dp-econ-value">${fmt.bn(c.pib_usd)}</span>
  </div>
  <div class="dp-econ-card">
    <span class="dp-econ-label">PIB / habitant</span>
    <span class="dp-econ-value">${c.pib_par_hab != null ? '$' + fmt.num(c.pib_par_hab) : '—'}</span>
  </div>
  <div class="dp-econ-card">
    <span class="dp-econ-label">Croissance</span>
    <span class="dp-econ-value" style="color:${growthColor}">
      ${growth != null ? growthSign + fmt.pct(growth) : '—'}
    </span>
  </div>
  <div class="dp-econ-card">
    <span class="dp-econ-label">Dépense militaire</span>
    <span class="dp-econ-value">${fmt.pct(c.dep_militaire_pct_pib)} <span class="dp-econ-unit">du PIB</span></span>
  </div>
</div>

<div class="dp-section-title">Frontières (${borders.length})</div>
<div class="dp-borders">${bordersHtml}</div>
`;
}

// ── Data loading ──────────────────────────────────────────────
async function loadCountries() {
  if (_loaded) return true;
  try {
    const resp = await fetch('./data/countries.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    _allCountries = await resp.json();

    // Rebuild cca2 from id using a restcountries iso mapping (best-effort inline table)
    // cca3 → cca2 lookup built from the dataset itself isn't available after strip,
    // so we'll use the flagcdn approach with cca3 → direct flag URL via restcountries
    // Alternative: use flag.svg via restcountries CDN
    _allCountries.forEach(c => {
      c._searchKey = (c.nom_officiel + ' ' + (c.capitale || '') + ' ' + c.id).toLowerCase();
    });

    _filtered = [..._allCountries];
    _loaded = true;
    return true;
  } catch (err) {
    console.error('[countries.js] Failed to load countries.json:', err);
    return false;
  }
}

// ── Rendering ─────────────────────────────────────────────────
function renderGrid() {
  if (!_grid) return;
  if (!_filtered.length) {
    _grid.innerHTML = `<div class="cv-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <p>Aucun pays trouvé</p>
    </div>`;
    return;
  }

  _grid.innerHTML = _filtered.map(buildCard).join('');

  // Attach click/keyboard handlers
  _grid.querySelectorAll('.country-card').forEach(card => {
    const open = () => openDetail(card.dataset.id);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
}

function openDetail(id) {
  const c = _allCountries.find(x => x.id === id);
  if (!c) return;
  _selected = c;

  // Highlight active card
  _grid.querySelectorAll('.country-card').forEach(el => {
    el.classList.toggle('is-active', el.dataset.id === id);
  });

  // Populate & show detail panel
  _panelInner.innerHTML = buildDetail(c);
  _panel.classList.remove('empty');

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'floating-panel-close';
  closeBtn.setAttribute('aria-label', 'Fermer la fiche');
  closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`;
  closeBtn.addEventListener('click', closeDetail);
  _panelInner.appendChild(closeBtn);

  // Scroll card into view
  const activeCard = _grid.querySelector(`.country-card[data-id="${id}"]`);
  activeCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeDetail() {
  _selected = null;
  _panel.classList.add('empty');
  _grid.querySelectorAll('.country-card').forEach(el => el.classList.remove('is-active'));
}

// ── Search ────────────────────────────────────────────────────
function handleSearch(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    _filtered = [..._allCountries];
  } else {
    _filtered = _allCountries.filter(c => c._searchKey.includes(q));
  }
  // Close detail if selected country is no longer visible
  if (_selected && !_filtered.find(c => c.id === _selected.id)) {
    closeDetail();
  }
  renderGrid();
}

// ── Public: init ──────────────────────────────────────────────
export async function initCountriesView() {
  // ── Build the countries shell ──────────────────────────────
  _shell = document.createElement('div');
  _shell.id = 'countriesCanvas';
  _shell.className = 'canvas-shell countries-shell';
  _shell.hidden = true;
  _shell.setAttribute('aria-label', 'Vue par pays');
  _shell.innerHTML = `
<div class="cv-topbar">
  <div class="cv-search-wrap">
    <svg class="cv-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none"
         stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <input id="cvSearch" class="cv-search-input" type="search"
           placeholder="Rechercher un pays, une capitale…"
           aria-label="Rechercher un pays">
  </div>
  <div id="cvCount" class="cv-count"></div>
</div>
<div id="cvGrid" class="cv-grid" role="list" aria-label="Liste des pays"></div>
`;
  // Insert before the shortcuts modal (last child before closing </div>)
  const app = document.querySelector('.app');
  app.appendChild(_shell);

  // ── Wire the detail panel ──────────────────────────────────
  _panel = document.getElementById('infoPanel');
  if (!_panel) {
    // Fallback: create one
    _panel = document.createElement('div');
    _panel.id = 'infoPanel';
    _panel.className = 'floating-panel empty';
    app.appendChild(_panel);
  }
  // Wrap content so we can clear inner without touching close btn
  _panelInner = document.createElement('div');
  _panelInner.className = 'fp-inner';
  _panel.innerHTML = '';
  _panel.appendChild(_panelInner);
  _panel.classList.add('empty');

  // ── Refs ───────────────────────────────────────────────────
  _searchInput = document.getElementById('cvSearch');
  _grid = document.getElementById('cvGrid');

  // ── Search handler ─────────────────────────────────────────
  let searchTimer;
  _searchInput.addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      handleSearch(e.target.value);
      updateCount();
    }, 180);
  });

  _searchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      _searchInput.value = '';
      handleSearch('');
      updateCount();
    }
  });

  // ── Close panel on Escape globally ────────────────────────
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _selected) closeDetail();
  });

  return true;
}

function updateCount() {
  const el = document.getElementById('cvCount');
  if (el) el.textContent = `${_filtered.length} pays`;
}

// ── Public: show ──────────────────────────────────────────────
export async function showCountriesView() {
  if (!_shell) await initCountriesView();
  _shell.hidden = false;

  if (!_loaded) {
    _grid.innerHTML = `<div class="cv-loading">
      <div class="cv-spinner"></div>
      <p>Chargement des données…</p>
    </div>`;
    const ok = await loadCountries();
    if (!ok) {
      _grid.innerHTML = `<div class="cv-empty cv-error">
        <p>⚠ Impossible de charger <code>data/countries.json</code>.</p>
        <p style="font-size:.8rem;color:var(--muted)">Assurez-vous d'exécuter l'application via un serveur HTTP.</p>
      </div>`;
      return;
    }
  }

  updateCount();
  renderGrid();
}

// ── Public: hide ──────────────────────────────────────────────
export function hideCountriesView() {
  if (_shell) _shell.hidden = true;
  closeDetail();
}
