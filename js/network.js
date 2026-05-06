// network.js — Force-directed network graph mode
import { state, getColor, RELATION_TYPES, getVisibleGraph, getNeighborLinks } from './store.js';
import { getFlagUrl } from './utils.js';

let networkSvg = null;
let simulation = null;
let networkNodes = [];
let networkLinks = [];
let hoveredId = null;
let isRunning = false;

const NODE_RADIUS = 26;

export function initNetwork() {
  const container = document.getElementById('networkCanvas');
  if (!container) return;
  networkSvg = d3.select('#networkGraph');
}

export function renderNetwork() {
  if (!networkSvg) return;

  const container = document.getElementById('networkCanvas');
  if (!container || container.hidden) return;

  const W = container.clientWidth;
  const H = container.clientHeight;
  networkSvg.attr('viewBox', `0 0 ${W} ${H}`);

  const { nodes: rawNodes, links: rawLinks } = getVisibleGraph();

  // Build node/link data for simulation
  // Only include nodes that have at least one link
  const linkData = rawLinks.map(l => ({
    ...l,
    source: typeof l.source === 'object' ? l.source.id : l.source,
    target: typeof l.target === 'object' ? l.target.id : l.target,
    id: l.id
  }));

  const linkedIds = new Set();
  linkData.forEach(l => { linkedIds.add(l.source); linkedIds.add(l.target); });

  // If no scenario active and no focus: show all nodes with at least 1 link in the full dataset
  const allLinks = state.links;
  const allLinkedIds = new Set();
  allLinks.forEach(l => {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    allLinkedIds.add(s); allLinkedIds.add(t);
  });

  const visibleNodeIds = linkedIds.size > 0 ? linkedIds : allLinkedIds;
  networkNodes = rawNodes.filter(n => visibleNodeIds.has(n.id)).map(n => ({
    ...n,
    name: n.name || n.label || n.id,
    code: n.code || (n.id && n.id.length === 2 ? n.id : null)
  }));

  if (linkData.length === 0) {
    // Show all nodes connected by all edges for network mode
    const allLinkData = state.links.map(l => ({
      ...l,
      source: typeof l.source === 'object' ? l.source.id : l.source,
      target: typeof l.target === 'object' ? l.target.id : l.target,
    }));
    networkLinks = allLinkData.filter(l => visibleNodeIds.has(l.source) && visibleNodeIds.has(l.target));
    networkNodes = rawNodes.filter(n => allLinkedIds.has(n.id)).map(n => ({
      ...n,
      name: n.name || n.label || n.id,
      code: n.code || (n.id && n.id.length === 2 ? n.id : null)
    }));
  } else {
    networkLinks = linkData.filter(l => visibleNodeIds.has(l.source) && visibleNodeIds.has(l.target));
  }

  // Clear and redraw
  networkSvg.selectAll('*').remove();

  // Defs for flag clips
  const defs = networkSvg.append('defs');
  networkNodes.forEach(n => {
    if (n.code && n.code.length === 2) {
      defs.append('clipPath').attr('id', `clip-net-${n.id}`)
        .append('circle').attr('r', NODE_RADIUS - 2);
    }
  });

  const linkGroup = networkSvg.append('g').attr('class', 'net-links');
  const nodeGroup = networkSvg.append('g').attr('class', 'net-nodes');

  // Create link elements
  const linkEls = linkGroup.selectAll('line')
    .data(networkLinks)
    .join('line')
    .attr('stroke', d => getColor(d.type))
    .attr('stroke-width', d => 1 + (d.intensity || d.strength || 3) * 0.3)
    .attr('stroke-dasharray', d => RELATION_TYPES[d.type]?.dash || '0')
    .attr('stroke-opacity', 0.55)
    .attr('stroke-linecap', 'round');

  // Create node elements
  const nodeEls = nodeGroup.selectAll('g.net-node')
    .data(networkNodes, d => d.id)
    .join('g')
    .attr('class', 'net-node')
    .style('cursor', 'pointer')
    .call(d3.drag()
      .on('start', dragStart)
      .on('drag', dragged)
      .on('end', dragEnd)
    )
    .on('click', (event, d) => {
      state.focusId = state.focusId === d.id ? null : d.id;
      state.infoId = d.id;
      updateNetworkStyles(linkEls, nodeEls);
      window.dispatchEvent(new CustomEvent('stateUpdated'));
    })
    .on('mouseenter', (event, d) => {
      hoveredId = d.id;
      updateNetworkStyles(linkEls, nodeEls);
      window.dispatchEvent(new CustomEvent('tooltipShow', { detail: { node: d, links: networkLinks, event } }));
    })
    .on('mousemove', event => {
      window.dispatchEvent(new CustomEvent('tooltipMove', { detail: { event } }));
    })
    .on('mouseleave', () => {
      hoveredId = null;
      updateNetworkStyles(linkEls, nodeEls);
      window.dispatchEvent(new CustomEvent('tooltipHide'));
    });

  // Background circle
  nodeEls.append('circle')
    .attr('r', NODE_RADIUS)
    .attr('fill', 'rgba(255,255,255,0.07)')
    .attr('stroke', 'rgba(255,255,255,0.6)')
    .attr('stroke-width', 1.5);

  // Flag image for nodes with ISO code
  nodeEls.filter(d => d.code && d.code.length === 2)
    .append('image')
    .attr('href', d => getFlagUrl(d.code))
    .attr('x', -NODE_RADIUS + 2).attr('y', -NODE_RADIUS + 2)
    .attr('width', (NODE_RADIUS - 2) * 2).attr('height', (NODE_RADIUS - 2) * 2)
    .style('clip-path', d => `url(#clip-net-${d.id})`)
    .attr('preserveAspectRatio', 'xMidYMid slice')
    .on('error', function(event, d) {
      d3.select(this).remove();
      d3.select(this.parentNode).append('text')
        .attr('text-anchor', 'middle').attr('dy', 4).attr('font-size', 10)
        .attr('fill', 'var(--text)')
        .text((d.name || d.id || '').slice(0, 3).toUpperCase());
    });

  // Text fallback
  nodeEls.filter(d => !d.code || d.code.length !== 2)
    .append('text')
    .attr('text-anchor', 'middle').attr('dy', 4).attr('font-size', 10)
    .attr('fill', 'var(--text)')
    .text(d => (d.name || d.id).slice(0, 3).toUpperCase());

  // Label below node
  nodeEls.append('text')
    .attr('class', 'net-label')
    .attr('text-anchor', 'middle')
    .attr('dy', NODE_RADIUS + 14)
    .attr('font-size', 11)
    .attr('font-weight', 700)
    .attr('fill', 'var(--text)')
    .style('pointer-events', 'none')
    .text(d => d.name || d.label || d.id);

  // Stop any existing simulation
  if (simulation) simulation.stop();

  // Set initial positions around center
  const cx = W / 2, cy = H / 2;
  networkNodes.forEach((n, i) => {
    if (!n.x || !n.y) {
      const angle = (i / networkNodes.length) * 2 * Math.PI;
      const r = Math.min(W, H) * 0.3;
      n.x = cx + r * Math.cos(angle);
      n.y = cy + r * Math.sin(angle);
    }
  });

  // Force simulation
  simulation = d3.forceSimulation(networkNodes)
    .force('link', d3.forceLink(networkLinks)
      .id(d => d.id)
      .distance(d => {
        const intensity = d.intensity || d.strength || 3;
        if (d.type === 'alliance') return 80 - intensity * 6;
        if (d.type === 'conflict' || d.type === 'rivalry') return 150 + intensity * 10;
        return 120;
      })
      .strength(d => {
        if (d.type === 'alliance') return 0.6;
        if (d.type === 'conflict' || d.type === 'rivalry') return 0.2;
        return 0.4;
      })
    )
    .force('charge', d3.forceManyBody().strength(-300).distanceMax(400))
    .force('center', d3.forceCenter(cx, cy).strength(0.08))
    .force('collision', d3.forceCollide(NODE_RADIUS + 18))
    .on('tick', () => {
      // Clamp to viewport
      networkNodes.forEach(n => {
        n.x = Math.max(NODE_RADIUS + 2, Math.min(W - NODE_RADIUS - 2, n.x));
        n.y = Math.max(NODE_RADIUS + 2, Math.min(H - NODE_RADIUS - 40, n.y));
      });

      linkEls
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodeEls.attr('transform', d => `translate(${d.x},${d.y})`);
    })
    .alphaDecay(0.02);

  isRunning = true;
  updateNetworkStyles(linkEls, nodeEls);
}

function updateNetworkStyles(linkEls, nodeEls) {
  const active = hoveredId || state.focusId;
  if (!active) {
    nodeEls.style('opacity', 1);
    linkEls.attr('stroke-opacity', 0.55);
    return;
  }
  const neighbors = new Set([active]);
  const activeLinks = new Set();
  networkLinks.forEach(l => {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    if (s === active || t === active) {
      neighbors.add(s); neighbors.add(t);
      activeLinks.add(l.id || `${s}-${t}`);
    }
  });
  nodeEls.style('opacity', d => neighbors.has(d.id) ? 1 : 0.1);
  linkEls.attr('stroke-opacity', d => {
    const s = typeof d.source === 'object' ? d.source.id : d.source;
    const t = typeof d.target === 'object' ? d.target.id : d.target;
    return (s === active || t === active) ? 0.9 : 0.05;
  });
}

function dragStart(event, d) {
  if (!event.active && simulation) simulation.alphaTarget(0.3).restart();
  d.fx = d.x; d.fy = d.y;
}
function dragged(event, d) {
  d.fx = event.x; d.fy = event.y;
}
function dragEnd(event, d) {
  if (!event.active && simulation) simulation.alphaTarget(0);
  d.fx = null; d.fy = null;
}

export function stopNetwork() {
  if (simulation) { simulation.stop(); simulation = null; }
  isRunning = false;
}

// ── Alliance data helpers ────────────────────────────────────────────────────

export async function loadAlliances() {
  try {
    const r = await fetch('./data/alliances.json');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.error('Erreur alliances.json:', e);
    return null;
  }
}

export function getLinksByCountry(cca3, allData) {
  if (!allData || !allData.links) return [];
  return allData.links.filter(l => l.source === cca3 || l.target === cca3);
}

export function getAlliancesByCountry(cca3, allData) {
  if (!allData || !allData.alliances) return [];
  return allData.alliances.filter(a => a.members.includes(cca3));
}

export function highlightNodeInNetwork(nodeId) {
  if (!networkSvg) return;
  const nodeEls = networkSvg.selectAll('g.net-node');
  const linkEls = networkSvg.selectAll('line');
  hoveredId = nodeId;
  updateNetworkStyles(linkEls, nodeEls);

  // Pan to node
  const node = networkNodes.find(n => n.id === nodeId);
  if (node && node.x && node.y) {
    const container = document.getElementById('networkCanvas');
    const W = container.clientWidth, H = container.clientHeight;
    networkSvg.transition().duration(600)
      .attr('viewBox', `${node.x - W/2} ${node.y - H/2} ${W} ${H}`);
  }
}
