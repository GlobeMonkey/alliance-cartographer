import { state } from '../store.js';
import { renderDefaultPanel } from './default-panel.js';
import { renderNodeDetail } from './node-detail.js';
import { renderEdgeDetail } from './edge-detail.js';

let panelEl = null;
let _callbacks = {};
let _selectedEdge = null;

export function initSidePanel(callbacks = {}) {
  _callbacks = callbacks;
  panelEl = document.getElementById('sidePanel');
  if (!panelEl) return;

  window.addEventListener('stateUpdated', _handleStateUpdate);
  window.addEventListener('edgeSelected', _handleEdgeSelected);

  _showDefault();
}

export function updateSidePanel({ selectedNode = null, selectedEdge = null } = {}) {
  if (!panelEl) return;
  if (selectedEdge) {
    _selectedEdge = selectedEdge;
    _showEdge(selectedEdge);
  } else if (selectedNode) {
    _selectedEdge = null;
    _showNode(selectedNode);
  } else {
    _selectedEdge = null;
    _showDefault();
  }
}

function _handleStateUpdate() {
  _selectedEdge = null;
  if (state.infoId) {
    const node = state.nodes.find(n => n.id === state.infoId);
    if (node) { _showNode(node); return; }
  }
  _showDefault();
}

function _handleEdgeSelected(event) {
  const edge = event.detail;
  if (!edge || !panelEl) return;
  _selectedEdge = edge;
  _showEdge(edge);
}

function _handleClose() {
  state.focusId = null;
  state.infoId = null;
  _selectedEdge = null;
  _showDefault();
  _callbacks.onClose?.();
  window.dispatchEvent(new CustomEvent('sidePanelClosed'));
}

function _showNode(node) {
  panelEl.classList.remove('sp-hidden');
  renderNodeDetail(panelEl, node, { ..._callbacks, onClose: _handleClose });
}

function _showEdge(edge) {
  panelEl.classList.remove('sp-hidden');
  renderEdgeDetail(panelEl, edge, state.nodes, { ..._callbacks, onClose: _handleClose });
}

function _showDefault() {
  if (!panelEl) return;
  panelEl.classList.add('sp-hidden');
  renderDefaultPanel(panelEl);
}
