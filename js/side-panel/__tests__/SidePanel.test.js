import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderDefaultPanel } from '../default-panel.js';
import { renderNodeDetail } from '../node-detail.js';
import { renderEdgeDetail } from '../edge-detail.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_NODE = {
  id: 'FR',
  name: 'France',
  label: 'France',
  code: 'FR',
  lon: 2.35,
  lat: 48.85,
  region: 'Europe occidentale',
  regime: 'République',
  population: 67_000_000,
  gdp: 2_700_000_000_000,
  type: 'country',
};

const MOCK_NODE_MINIMAL = {
  id: 'XK',
  name: 'Kosovo',
  type: 'unrecognized',
};

const MOCK_EDGE = {
  id: 'link-fr-de',
  source: 'FR',
  target: 'DE',
  type: 'alliance',
  intensity: 4,
  startYear: 1949,
  endYear: 2035,
  scenario: null,
};

const MOCK_EDGE_WITH_SCENARIO = {
  ...MOCK_EDGE,
  id: 'link-2',
  type: 'conflict',
  intensity: 2,
  scenario: 'cold-war',
};

const MOCK_NODES = [
  { id: 'FR', name: 'France', code: 'FR' },
  { id: 'DE', name: 'Allemagne', code: 'DE' },
];

// ── renderDefaultPanel ────────────────────────────────────────────────────────

describe('renderDefaultPanel', () => {
  it('renders the empty-state prompt', () => {
    const div = document.createElement('div');
    renderDefaultPanel(div);
    expect(div.querySelector('.sp-default')).toBeTruthy();
    expect(div.textContent).toContain('Cliquez');
  });

  it('replaces existing content', () => {
    const div = document.createElement('div');
    div.innerHTML = '<p>stale content</p>';
    renderDefaultPanel(div);
    expect(div.querySelector('p')?.textContent).not.toBe('stale content');
  });
});

// ── renderNodeDetail ──────────────────────────────────────────────────────────

describe('renderNodeDetail', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders the node name', () => {
    renderNodeDetail(container, MOCK_NODE, {});
    expect(container.textContent).toContain('France');
  });

  it('renders region and regime', () => {
    renderNodeDetail(container, MOCK_NODE, {});
    expect(container.textContent).toContain('Europe occidentale');
    expect(container.textContent).toContain('République');
  });

  it('renders formatted coordinates', () => {
    renderNodeDetail(container, MOCK_NODE, {});
    expect(container.textContent).toContain('2.35');
    expect(container.textContent).toContain('48.85');
  });

  it('shows — for missing optional fields', () => {
    renderNodeDetail(container, MOCK_NODE_MINIMAL, {});
    // region, regime, gdp are missing → should show em-dash
    const dashes = [...container.querySelectorAll('.sp-attr-value')]
      .filter(el => el.textContent.trim() === '—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('renders center, edit, and delete buttons', () => {
    renderNodeDetail(container, MOCK_NODE, {});
    expect(container.querySelector('[data-action="center"]')).toBeTruthy();
    expect(container.querySelector('[data-action="edit"]')).toBeTruthy();
    expect(container.querySelector('[data-action="delete"]')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    renderNodeDetail(container, MOCK_NODE, { onClose });
    container.querySelector('[data-action="close"]').click();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onCenter with the node when center is clicked', () => {
    const onCenter = vi.fn();
    renderNodeDetail(container, MOCK_NODE, { onCenter });
    container.querySelector('[data-action="center"]').click();
    expect(onCenter).toHaveBeenCalledWith(MOCK_NODE);
  });

  it('calls onEdit with the node when edit is clicked', () => {
    const onEdit = vi.fn();
    renderNodeDetail(container, MOCK_NODE, { onEdit });
    container.querySelector('[data-action="edit"]').click();
    expect(onEdit).toHaveBeenCalledWith(MOCK_NODE);
  });

  it('calls onDelete after user confirms the dialog', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onDelete = vi.fn();
    renderNodeDetail(container, MOCK_NODE, { onDelete });
    container.querySelector('[data-action="delete"]').click();
    expect(onDelete).toHaveBeenCalledWith(MOCK_NODE);
  });

  it('does NOT call onDelete when user cancels the dialog', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onDelete = vi.fn();
    renderNodeDetail(container, MOCK_NODE, { onDelete });
    container.querySelector('[data-action="delete"]').click();
    expect(onDelete).not.toHaveBeenCalled();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});

// ── renderEdgeDetail ──────────────────────────────────────────────────────────

describe('renderEdgeDetail', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders both endpoint country names', () => {
    renderEdgeDetail(container, MOCK_EDGE, MOCK_NODES, {});
    expect(container.textContent).toContain('France');
    expect(container.textContent).toContain('Allemagne');
  });

  it('renders the relation type badge', () => {
    renderEdgeDetail(container, MOCK_EDGE, MOCK_NODES, {});
    const badge = container.querySelector('.sp-badge--alliance');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('Alliance');
  });

  it('renders the conflict badge for conflict type', () => {
    renderEdgeDetail(container, MOCK_EDGE_WITH_SCENARIO, MOCK_NODES, {});
    expect(container.querySelector('.sp-badge--conflict')).toBeTruthy();
  });

  it('renders intensity bar at correct width', () => {
    renderEdgeDetail(container, MOCK_EDGE, MOCK_NODES, {});
    const bar = container.querySelector('.sp-intensity-bar');
    expect(bar.style.width).toBe('80%'); // intensity 4/5 = 80%
  });

  it('renders startYear and endYear', () => {
    renderEdgeDetail(container, MOCK_EDGE, MOCK_NODES, {});
    expect(container.textContent).toContain('1949');
    expect(container.textContent).toContain('2035');
  });

  it('renders scenario when present', () => {
    renderEdgeDetail(container, MOCK_EDGE_WITH_SCENARIO, MOCK_NODES, {});
    expect(container.textContent).toContain('cold-war');
  });

  it('omits scenario section when null', () => {
    renderEdgeDetail(container, MOCK_EDGE, MOCK_NODES, {});
    expect(container.textContent).not.toContain('Scénario');
  });

  it('renders edit and delete buttons', () => {
    renderEdgeDetail(container, MOCK_EDGE, MOCK_NODES, {});
    expect(container.querySelector('[data-action="edit"]')).toBeTruthy();
    expect(container.querySelector('[data-action="delete"]')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    renderEdgeDetail(container, MOCK_EDGE, MOCK_NODES, { onClose });
    container.querySelector('[data-action="close"]').click();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onEdit with the edge when edit is clicked', () => {
    const onEdit = vi.fn();
    renderEdgeDetail(container, MOCK_EDGE, MOCK_NODES, { onEdit });
    container.querySelector('[data-action="edit"]').click();
    expect(onEdit).toHaveBeenCalledWith(MOCK_EDGE);
  });

  it('calls onDelete with the edge after user confirms', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onDelete = vi.fn();
    renderEdgeDetail(container, MOCK_EDGE, MOCK_NODES, { onDelete });
    container.querySelector('[data-action="delete"]').click();
    expect(onDelete).toHaveBeenCalledWith(MOCK_EDGE);
  });

  it('does NOT call onDelete when user cancels the dialog', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onDelete = vi.fn();
    renderEdgeDetail(container, MOCK_EDGE, MOCK_NODES, { onDelete });
    container.querySelector('[data-action="delete"]').click();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('handles missing nodes gracefully (shows em-dash)', () => {
    renderEdgeDetail(container, MOCK_EDGE, [], {});
    const names = [...container.querySelectorAll('.sp-edge-node-name')];
    expect(names.some(el => el.textContent === '—')).toBe(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
