import { getFlagUrl } from '../utils.js';

const fmtNum = (n) => (n != null && n !== 'N/A' && Number.isFinite(Number(n)))
  ? Number(n).toLocaleString('fr-FR') : '—';

const fmtBn = (n) => {
  if (n == null || n === 'N/A') return '—';
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)} T$`;
  if (v >= 1e9)  return `${(v / 1e9).toFixed(1)} Md$`;
  if (v >= 1e6)  return `${(v / 1e6).toFixed(1)} M$`;
  return `${v.toLocaleString('fr-FR')} $`;
};

const CLOSE_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`;

export function renderNodeDetail(container, node, callbacks) {
  const { onCenter, onClose } = callbacks || {};
  const flagUrl = getFlagUrl(node.code || node.id);

  container.innerHTML = `
    <div class="sp-header">
      <div class="sp-header-info">
        ${flagUrl ? `<img class="sp-flag" src="${flagUrl}" alt="${node.name || ''}" onerror="this.style.display='none'">` : ''}
        <span class="sp-title">${node.name || node.label || node.id}</span>
      </div>
      <button class="sp-close-btn" data-action="close" aria-label="Fermer">${CLOSE_ICON}</button>
    </div>
    <div class="sp-body">
      <div class="sp-section">
        <div class="sp-section-title">Identité</div>
        <div class="sp-attrs">
          <div class="sp-attr-row">
            <span class="sp-attr-label">Code ISO</span>
            <span class="sp-attr-value">${node.code || node.id || '—'}</span>
          </div>
          <div class="sp-attr-row">
            <span class="sp-attr-label">Région</span>
            <span class="sp-attr-value">${node.region || '—'}</span>
          </div>
          <div class="sp-attr-row">
            <span class="sp-attr-label">Régime</span>
            <span class="sp-attr-value">${node.regime || '—'}</span>
          </div>
          <div class="sp-attr-row">
            <span class="sp-attr-label">Type</span>
            <span class="sp-attr-value">${node.type || '—'}</span>
          </div>
        </div>
      </div>
      <div class="sp-section">
        <div class="sp-section-title">Données</div>
        <div class="sp-attrs">
          <div class="sp-attr-row">
            <span class="sp-attr-label">Population</span>
            <span class="sp-attr-value">${fmtNum(node.population)}</span>
          </div>
          <div class="sp-attr-row">
            <span class="sp-attr-label">PIB</span>
            <span class="sp-attr-value">${fmtBn(node.gdp)}</span>
          </div>
          <div class="sp-attr-row">
            <span class="sp-attr-label">Longitude</span>
            <span class="sp-attr-value">${node.lon != null ? Number(node.lon).toFixed(2) : '—'}</span>
          </div>
          <div class="sp-attr-row">
            <span class="sp-attr-label">Latitude</span>
            <span class="sp-attr-value">${node.lat != null ? Number(node.lat).toFixed(2) : '—'}</span>
          </div>
        </div>
      </div>
      <div class="sp-actions">
        <button class="sp-btn sp-btn--primary" data-action="center">Centrer</button>
      </div>
    </div>
  `;

  container.querySelector('[data-action="close"]')
    ?.addEventListener('click', () => onClose?.());

  container.querySelector('[data-action="center"]')
    ?.addEventListener('click', () => onCenter?.(node));
}
