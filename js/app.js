import { initGraph, renderGraph, zoomToNode } from './render.js';
import { loadData } from './data-loader.js';
import { initSidePanel } from './side-panel/index.js';

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

// ── State ──
let allCountries = [];
let filteredCountries = [];
let activeCountryId = null;

// ── DOM Elements ──
const gridEl = document.getElementById('countriesGrid');
const countEl = document.getElementById('countriesCount');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const detailPanel = document.getElementById('detailPanel');
const panelContent = document.getElementById('panelContent');
const closePanelBtn = document.getElementById('closePanelBtn');

// ── Formatters ──
const fmt = {
  num: (n) => n != null ? Number(n).toLocaleString('fr-FR') : 'N/D',
  usd: (n) => n != null ? `$${Number(n).toLocaleString('fr-FR')}` : 'N/D',
  pct: (n) => n != null ? `${Number(n).toFixed(2)}%` : 'N/D',
  bn: (n) => {
    if (n == null) return 'N/D';
    if (n >= 1e12) return `${(n / 1e12).toFixed(2)} T$`;
    if (n >= 1e9)  return `${(n / 1e9).toFixed(1)} Md$`;
    if (n >= 1e6)  return `${(n / 1e6).toFixed(1)} M$`;
    return `${Number(n).toLocaleString('fr-FR')} $`;
  }
};

// ── Helpers ──
const getFlagUrl = (cca3) => {
  const alpha2 = CCA3_TO_CCA2[cca3] || '';
  return alpha2 ? `https://flagcdn.com/w80/${alpha2.toLowerCase()}.png` : '';
};

// ── Initialize App ──
async function init() {
  setupEventListeners();

  initSidePanel({
    onCenter: (node) => zoomToNode(node.id),
    onClose:  () => renderGraph(),
  });

  // Init map immediately — does not block the country grid
  initGraph();

  // Fetch map data and country cards in parallel
  const [worldData, rawCountries] = await Promise.all([
    loadData(),
    fetch('./data/countries.json')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .catch(err => { console.error("Erreur chargement countries.json:", err); return null; })
  ]);

  if (worldData) renderGraph();

  if (rawCountries) {
    allCountries = rawCountries.sort((a, b) => (a.nom_officiel || '').localeCompare(b.nom_officiel || ''));
    filteredCountries = [...allCountries];
    renderGrid();
  } else {
    gridEl.innerHTML = `
      <div class="loading-state">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--danger)" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>Erreur lors du chargement des données. Vérifiez data/countries.json.</p>
      </div>`;
  }
}

// ── Event Listeners ──
function setupEventListeners() {
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    clearSearchBtn.hidden = query.length === 0;
    
    if (query.length === 0) {
      filteredCountries = [...allCountries];
    } else {
      filteredCountries = allCountries.filter(c => {
        const name = c.nom_officiel?.toLowerCase() || '';
        const cap = c.capitale?.toLowerCase() || '';
        return name.includes(query) || cap.includes(query);
      });
    }
    
    renderGrid();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.hidden = true;
    filteredCountries = [...allCountries];
    renderGrid();
    searchInput.focus();
  });

  closePanelBtn.addEventListener('click', closePanel);
  
  // Fermer le panneau avec Échap
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });
}

// ── Render Grid ──
function renderGrid() {
  countEl.textContent = filteredCountries.length;
  
  if (filteredCountries.length === 0) {
    gridEl.innerHTML = `
      <div class="loading-state">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <p>Aucun pays ne correspond à votre recherche.</p>
      </div>`;
    return;
  }

  const html = filteredCountries.map(c => {
    const milPct = c.dep_militaire_pct_pib || 0;
    const barWidth = Math.min((milPct / 5) * 100, 100); // Plafond à 5% pour la barre
    const iso2 = c.id; // Fallback pour le drapeau
    
    return `
      <article class="country-card ${activeCountryId === c.id ? 'active' : ''}" data-id="${c.id}">
        <div class="card-header">
          <img src="${getFlagUrl(iso2)}" alt="${c.nom_officiel}" class="card-flag" 
               onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\'><rect width=\\'100\\' height=\\'100\\' fill=\\'%2330363d\\'/></svg>'">
          <div class="card-title-group">
            <h3 class="card-name">${c.nom_officiel || 'Inconnu'}</h3>
            <div class="card-capital">${c.capitale || 'Sans capitale'}</div>
          </div>
        </div>
        
        <div class="card-stats">
          <div class="stat-item">
            <span class="stat-label">Population</span>
            <span class="stat-value">${fmt.num(c.population)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">PIB/Hab</span>
            <span class="stat-value">${fmt.usd(c.pib_par_hab)}</span>
          </div>
        </div>
        
        <div class="card-military">
          <div class="military-label">
            <span>Défense</span>
            <span>${fmt.pct(c.dep_militaire_pct_pib)}</span>
          </div>
          <div class="military-track">
            <div class="military-bar" style="width: ${barWidth}%"></div>
          </div>
        </div>
      </article>
    `;
  }).join('');
  
  gridEl.innerHTML = html;

  // Attacher les événements de clic
  gridEl.querySelectorAll('.country-card').forEach(card => {
    card.addEventListener('click', () => openPanel(card.dataset.id));
  });
}

// ── Side Panel Logic ──
function openPanel(id) {
  const country = allCountries.find(c => c.id === id);
  if (!country) return;
  
  activeCountryId = id;
  renderGrid(); // Pour mettre à jour la classe .active sur la grille
  
  // Générer les tags de frontières
  const bordersHtml = (country.frontieres && country.frontieres.length > 0)
    ? country.frontieres.map(b => `<span class="tag">${b}</span>`).join('')
    : '<span class="dp-value">Aucune (Insulaire)</span>';

  // Générer les tags de langues
  const languesHtml = (country.langues && country.langues.length > 0)
    ? country.langues.map(l => `<span class="tag">${l}</span>`).join('')
    : '<span class="dp-value">N/D</span>';
    
  const growth = country.croissance_pct;
  const growthClass = growth == null ? '' : (growth > 0 ? 'success' : 'danger');
  const growthSign = growth > 0 ? '+' : '';

  panelContent.innerHTML = `
    <div class="dp-header">
      <img src="${getFlagUrl(country.id)}" alt="${country.nom_officiel}" class="dp-flag"
           onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\'><rect width=\\'100\\' height=\\'100\\' fill=\\'%2330363d\\'/></svg>'">
      <h2 class="dp-name">${country.nom_officiel}</h2>
      <div class="dp-region">${country.region || 'N/D'}</div>
    </div>
    
    <div class="dp-section">
      <h3 class="dp-section-title">Aperçu Géographique</h3>
      <div class="dp-grid">
        <div class="dp-block">
          <div class="dp-label">Capitale</div>
          <div class="dp-value">${country.capitale || 'N/D'}</div>
        </div>
        <div class="dp-block">
          <div class="dp-label">Population</div>
          <div class="dp-value">${fmt.num(country.population)}</div>
        </div>
        <div class="dp-block">
          <div class="dp-label">Superficie</div>
          <div class="dp-value">${fmt.num(country.superficie_km2)} km²</div>
        </div>
        <div class="dp-block">
          <div class="dp-label">Accès à la mer</div>
          <div class="dp-value">${country.acces_mer ? 'Oui 🌊' : 'Non (Enclavé)'}</div>
        </div>
      </div>
    </div>
    
    <div class="dp-section">
      <h3 class="dp-section-title">Indicateurs Économiques</h3>
      <div class="dp-grid">
        <div class="dp-block full">
          <div class="dp-label">PIB Total (USD)</div>
          <div class="dp-value accent">${fmt.bn(country.pib_usd)}</div>
        </div>
        <div class="dp-block">
          <div class="dp-label">PIB/Habitant</div>
          <div class="dp-value">${fmt.usd(country.pib_par_hab)}</div>
        </div>
        <div class="dp-block">
          <div class="dp-label">Croissance Annuelle</div>
          <div class="dp-value ${growthClass}">${growth != null ? growthSign + fmt.pct(growth) : 'N/D'}</div>
        </div>
      </div>
    </div>
    
    <div class="dp-section">
      <h3 class="dp-section-title">Défense & Stratégie</h3>
      <div class="dp-grid">
        <div class="dp-block full">
          <div class="dp-label">Dépense Militaire (% du PIB)</div>
          <div class="dp-value danger">${fmt.pct(country.dep_militaire_pct_pib)}</div>
        </div>
        <div class="dp-block full">
          <div class="dp-label">Frontières Terrestres</div>
          <div class="tag-list" style="margin-top: 8px;">${bordersHtml}</div>
        </div>
        <div class="dp-block full">
          <div class="dp-label">Langues Officielles</div>
          <div class="tag-list" style="margin-top: 8px;">${languesHtml}</div>
        </div>
      </div>
    </div>
  `;
  
  // Afficher le panneau
  detailPanel.classList.remove('hidden');
}

function closePanel() {
  detailPanel.classList.add('hidden');
  activeCountryId = null;
  renderGrid(); // Désélectionner la carte
}

// ── Démarrage ──
document.addEventListener('DOMContentLoaded', init);
