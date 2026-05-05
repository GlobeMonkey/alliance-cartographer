import { getFlagUrl } from '../utils.js';

const RELATION_LABELS = {
  alliance:    'Alliance',
  partnership: 'Partenariat',
  neutral:     'Neutre',
  rivalry:     'Rivalité',
  conflict:    'Conflit',
};

const CLOSE_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`;

function nodeChip(n) {
  if (!n) return '<div class="sp-edge-node"><span class="sp-edge-node-name">—</span></div>';
  const flagUrl = n.code ? getFlagUrl(n.code) : '';
  return `
    <div class="sp-edge-node">
      ${flagUrl ? `<img class="sp-edge-node-flag" src="${flagUrl}" alt="${n.name || ''}" onerror="this.style.display='none'">` : ''}
      <span class="sp-edge-node-name">${n.name || n.id}</span>
    </div>`;
}

export function renderEdgeDetail(container, edge, nodes, callbacks) {
  const { onEdit, onDelete, onClose } = callbacks || {};
  const nodeMap = new Map((nodes || []).map(n => [n.id, n]));
  const srcId = typeof edge.source === 'object' ? edge.source.id : edge.source;
  const tgtId = typeof edge.target === 'object' ? edge.target.id : edge.target;
  const src = nodeMap.get(srcId);
  const tgt = nodeMap.get(tgtId);

  const intensityPct = Math.round(((edge.intensity || 1) / 5) * 100);
  const typeLabel = RELATION_LABELS[edge.type] || edge.type;

  container.innerHTML = `
    <div class="sp-header">
      <div class="sp-header-info">
        <span class="sp-title">Relation</span>
      </div>
      <button class="sp-close-btn" data-action="close" aria-label="Fermer">${CLOSE_ICON}</button>
    </div>
    <div class="sp-body">
      <div class="sp-section">
        <div class="sp-section-title">Acteurs</div>
        <div class="sp-edge-route">
          ${nodeChip(src)}
          <span class="sp-edge-arrow">→</span>
          ${nodeChip(tgt)}
        </div>
      </div>
      <div class="sp-section">
        <div class="sp-section-title">Caractéristiques</div>
        <div class="sp-attrs">
          <div class="sp-attr-row">
            <span class="sp-attr-label">Type</span>
            <span class="sp-attr-value">
              <span class="sp-badge sp-badge--${edge.type}">${typeLabel}</span>
            </span>
          </div>
          <div class="sp-attr-row">
            <span class="sp-attr-label">Intensité</span>
            <span class="sp-attr-value" style="flex:1; max-width:160px;">
              <div class="sp-intensity">
                <div class="sp-intensity-track">
                  <div class="sp-intensity-bar" style="width:${intensityPct}%"></div>
                </div>
                <span class="sp-intensity-label">${edge.intensity || 1}/5</span>
              </div>
            </span>
          </div>
          <div class="sp-attr-row">
            <span class="sp-attr-label">Début</span>
            <span class="sp-attr-value">${edge.startYear ?? '—'}</span>
          </div>
          <div class="sp-attr-row">
            <span class="sp-attr-label">Fin</span>
            <span class="sp-attr-value">${edge.endYear ?? '—'}</span>
          </div>
          ${edge.scenario ? `
          <div class="sp-attr-row">
            <span class="sp-attr-label">Scénario</span>
            <span class="sp-attr-value">${edge.scenario}</span>
          </div>` : ''}
        </div>
      </div>
      <div class="sp-actions">
        <button class="sp-btn" data-action="edit">Modifier</button>
        <button class="sp-btn sp-btn--danger" data-action="delete">Supprimer</button>
      </div>
    </div>
  `;

  container.querySelector('[data-action="close"]')
    ?.addEventListener('click', () => onClose?.());

  container.querySelector('[data-action="edit"]')
    ?.addEventListener('click', () => onEdit?.(edge));

  container.querySelector('[data-action="delete"]')
    ?.addEventListener('click', () => {
      const label = `${src?.name || srcId} → ${tgt?.name || tgtId}`;
      if (confirm(`Supprimer la relation ${label} ?`)) onDelete?.(edge);
    });
}
