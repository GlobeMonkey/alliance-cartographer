import { state, getColor, RELATION_TYPES, getVisibleGraph, getNeighborLinks } from './store.js';
import { worldGeo } from './data-loader.js';
import { getFlagUrl } from './utils.js';

let svg, mainLayer, mapLayer, territoryLayer, linkLayer, clusterLayer, nodeLayer, labelLayer;
let minimapSvg, zoomBehavior, projection, geoPath;
let graphWidth = 0, graphHeight = 0;
let worldWrapWidth = 0;
let lastRenderCache = null;
let lastSelections = null;
let hoveredCountryId = null;
// Map from ISO numeric code (TopoJSON) to our node id (ISO alpha-2)
let numericToAlpha = new Map();

const CLUSTER_COLORS = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#f15bb5"];

// ISO numeric → alpha-2 lookup table (common countries)
const ISO_NUMERIC_TO_ALPHA2 = {
  "4":"AF","8":"AL","12":"DZ","24":"AO","32":"AR","36":"AU","40":"AT","31":"AZ",
  "50":"BD","112":"BY","56":"BE","64":"BT","68":"BO","70":"BA","72":"BW","76":"BR",
  "100":"BG","104":"MM","116":"KH","120":"CM","124":"CA","152":"CL","156":"CN",
  "170":"CO","178":"CG","180":"CD","188":"CR","191":"HR","192":"CU","196":"CY",
  "203":"CZ","208":"DK","218":"EC","818":"EG","222":"SV","231":"ET","246":"FI",
  "250":"FR","276":"DE","288":"GH","300":"GR","320":"GT","324":"GN","332":"HT",
  "340":"HN","348":"HU","356":"IN","360":"ID","364":"IR","368":"IQ","372":"IE",
  "376":"IL","380":"IT","388":"JM","392":"JP","400":"JO","398":"KZ","404":"KE",
  "408":"KP","410":"KR","414":"KW","418":"LA","422":"LB","434":"LY","440":"LT",
  "442":"LU","446":"MO","458":"MY","484":"MX","504":"MA","508":"MZ","516":"NA",
  "524":"NP","528":"NL","540":"NC","554":"NZ","558":"NI","566":"NG","578":"NO",
  "512":"OM","586":"PK","591":"PA","604":"PE","608":"PH","616":"PL","620":"PT",
  "630":"PR","634":"QA","642":"RO","643":"RU","646":"RW","682":"SA","686":"SN",
  "694":"SL","703":"SK","705":"SI","706":"SO","710":"ZA","724":"ES","729":"SD",
  "752":"SE","756":"CH","760":"SY","158":"TW","762":"TJ","764":"TH","792":"TR",
  "800":"UG","804":"UA","784":"AE","826":"GB","840":"US","858":"UY","860":"UZ",
  "862":"VE","704":"VN","887":"YE","894":"ZM","716":"ZW","288":"GH","332":"HT",
  "275":"PS","383":"XK"
};

export function initGraph() {
  const container = document.querySelector(".canvas-shell");
  if (!container) return;

  svg = d3.select("#graph");
  minimapSvg = d3.select("#minimap");

  mainLayer = svg.append("g").attr("class", "main-layer");
  mapLayer = mainLayer.append("g").attr("class", "map-layer");
  territoryLayer = mainLayer.append("g").attr("class", "territory-layer");
  linkLayer = mainLayer.append("g").attr("class", "link-layer");
  clusterLayer = mainLayer.append("g").attr("class", "cluster-layer");
  nodeLayer = mainLayer.append("g").attr("class", "node-layer");
  labelLayer = mainLayer.append("g").attr("class", "label-layer");

  // Build numeric → alpha-2 map for quick lookups on territory hover
  numericToAlpha = new Map(Object.entries(ISO_NUMERIC_TO_ALPHA2));

  zoomBehavior = d3.zoom()
    .scaleExtent([1, 12]) // min scale 1 = can't zoom out past full world
    .on("zoom", (event) => {
      let t = event.transform;
      // Infinite horizontal panning modulo
      if (worldWrapWidth && t.k) {
        const period = worldWrapWidth * t.k;
        if (t.x > period / 2) t.x -= period;
        else if (t.x < -period / 2) t.x += period;
      }
      state.transform = t;
      mainLayer.attr("transform", t);
      applyZoomResponsiveStyles();
    });

  svg.call(zoomBehavior);
}

let hasAugmentedNodes = false;

export function renderGraph() {
  if (!svg) return;
  
  if (!hasAugmentedNodes && worldGeo) {
    hasAugmentedNodes = true;
    const custom = {
      "United States of America": "US", "United Kingdom": "GB", "France": "FR",
      "South Korea": "KR", "North Korea": "KP", "Russia": "RU", "China": "CN",
      "Taiwan": "TW", "Turkey": "TR", "Democratic Republic of the Congo": "CD",
      "Republic of the Congo": "CG", "Iran": "IR", "Syria": "SY", "Venezuela": "VE",
      "Bolivia": "BO", "Tanzania": "TZ", "Ivory Coast": "CI", "United Arab Emirates": "AE",
      "Czechia": "CZ", "Macedonia": "MK"
    };
    worldGeo.features.forEach(f => {
      const name = f.properties.name;
      if (!name) return;
      const alpha2 = ISO_NUMERIC_TO_ALPHA2[String(f.id)] || custom[name] || String(f.id);
      const nLow = name.toLowerCase();
      let node = state.nodes.find(n => n.id === alpha2 || n.code === alpha2 || (n.name && n.name.toLowerCase() === nLow) || (n.label && n.label.toLowerCase() === nLow));
      if (!node) {
        const centroid = d3.geoCentroid(f);
        node = { id: alpha2, name: name, label: name, code: alpha2.length === 2 ? alpha2 : null, type: "country", region: "N/A", regime: "N/A", population: "N/A", gdp: "N/A", lon: centroid[0], lat: centroid[1] };
        state.nodes.push(node);
      }
      numericToAlpha.set(String(f.id), node.id);
    });
  }
  const container = document.querySelector(".main");
  graphWidth = container.clientWidth;
  graphHeight = container.clientHeight;
  svg.attr("viewBox", `0 0 ${graphWidth} ${graphHeight}`);

  projection = d3.geoEquirectangular()
    .fitExtent([[0, 0], [graphWidth, graphHeight]], { type: "Sphere" });
  geoPath = d3.geoPath(projection);

  const sphereBounds = geoPath.bounds({ type: "Sphere" });
  worldWrapWidth = sphereBounds[1][0] - sphereBounds[0][0];

  // Update min scale so user can't zoom out beyond the map
  zoomBehavior.scaleExtent([1, 12]);

  const visible = getVisibleGraph();
  const nodes = prepareProjectedNodes(visible.nodes);
  const projectedById = new Map(nodes.map((node) => [node.id, node]));
  // Also index by code for territory lookups
  const projectedByCode = new Map(nodes.filter(n => n.code).map(n => [n.code, n]));

  const links = visible.links.map((link) => ({
    ...link,
    source: projectedById.get(typeof link.source === "object" ? link.source.id : link.source),
    target: projectedById.get(typeof link.target === "object" ? link.target.id : link.target)
  })).filter((link) => link.source && link.target);

  const clusters = computeClusters(links);
  lastRenderCache = { nodes, links, clusters, projectedByCode };

  renderBaseMap();
  renderTerritories(new Set(nodes.map(n => n.code).filter(Boolean)), links, projectedByCode);

  const clusterData = clusters.map((memberIds, index) => ({ memberIds, color: CLUSTER_COLORS[index % CLUSTER_COLORS.length] }));
  const repeatedLinkData = [-1, 0, 1].flatMap((copyIndex) =>
    links.map((link) => ({
      ...link,
      copyIndex,
      drawSource: { ...link.source, x: link.source.x + copyIndex * worldWrapWidth, y: link.source.y },
      drawTarget: { ...link.target, x: link.target.x + copyIndex * worldWrapWidth, y: link.target.y }
    }))
  );

  const repeatedNodeData = [-1, 0, 1].flatMap((copyIndex) =>
    nodes.map((node) => ({ ...node, copyIndex, drawX: node.x + copyIndex * worldWrapWidth, drawY: node.y }))
  );

  const linkSelection = linkLayer.selectAll("path")
    .data(repeatedLinkData, (d) => `${d.id}-${d.copyIndex}`)
    .join(
      enter => enter.append("path")
        .attr("opacity", 0)
        .call(e => e.transition().duration(500).attr("opacity", 1)),
      update => update,
      exit => exit.transition().duration(500).attr("opacity", 0).remove()
    )
    .attr("d", (d) => createArcPath(d.drawSource, d.drawTarget))
    .attr("stroke", (d) => getColor(d.type))
    .attr("stroke-width", (d) => 1.4 + d.intensity * 0.9)
    .attr("stroke-dasharray", (d) => RELATION_TYPES[d.type] ? RELATION_TYPES[d.type].dash : "0")
    .attr("stroke-linecap", "round")
    .attr("fill", "none")
    .classed("is-conflict-active", (d) => d.type === "conflict" || d.type === "rivalry");

  const clusterSelection = clusterLayer.selectAll("circle")
    .data(clusterData, d => d.memberIds.join("-"))
    .join(
      enter => enter.append("circle")
        .attr("class", "cluster-ring")
        .attr("stroke", (d) => d.color)
        .attr("opacity", 0)
        .call(e => e.transition().duration(500).attr("opacity", 0.38)),
      update => update,
      exit => exit.transition().duration(500).attr("opacity", 0).remove()
    );

  clusterSelection.each(function(cluster) {
    const members = nodes.filter((node) => cluster.memberIds.includes(node.id));
    if (!members.length) return;
    const centerX = d3.mean(members, (m) => m.x);
    const centerY = d3.mean(members, (m) => m.y);
    const radius = d3.max(members, (m) => Math.hypot(m.x - centerX, m.y - centerY)) + 18;
    d3.select(this)
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", Math.max(radius, 28))
      .attr("opacity", state.focusId && !cluster.memberIds.includes(state.focusId) ? 0.08 : 0.38);
  });

  const nodeSelection = nodeLayer.selectAll("g.country-node")
    .data(repeatedNodeData, (d) => `${d.id}-${d.copyIndex}`)
    .join(
      enter => {
        const g = enter.append("g")
          .attr("class", "country-node")
          .attr("tabindex", 0)
          .attr("role", "button")
          .style("cursor", "pointer")
          .style("opacity", 0);

        g.append("circle")
          .attr("r", 24)
          .attr("fill", "rgba(255,255,255,0.06)")
          .attr("stroke", "var(--node-stroke)")
          .attr("stroke-width", 2);

        // Dashed border for unrecognized states
        g.filter(d => d.type === "unrecognized")
          .select("circle")
          .attr("stroke-dasharray", "4,2")
          .attr("stroke", "rgba(255,200,50,0.8)");

        // All countries with a 2-letter ISO code get their flag
        g.filter((d) => d.code && d.code.length === 2)
          .append("image")
          .attr("href", (d) => getFlagUrl(d.code))
          .attr("x", -21).attr("y", -15)
          .attr("width", 42).attr("height", 30)
          .attr("preserveAspectRatio", "xMidYMid slice")
          .attr("clip-path", "inset(0 round 10px)")
          .style("filter", (d) => d.type === "unrecognized" ? "grayscale(0.5) opacity(0.75)" : null)
          .on("error", function(event, d) {
            d3.select(this).remove();
            d3.select(this.parentNode).append("text")
              .attr("text-anchor", "middle").attr("dy", 5).attr("font-size", 10)
              .attr("fill", "var(--text)")
              .text((d.name || d.id || "").slice(0, 3).toUpperCase());
          });

        // Fallback text for entities without ISO code
        g.filter((d) => !d.code || d.code.length !== 2)
          .append("text")
          .attr("text-anchor", "middle").attr("dy", 5).attr("font-size", 10)
          .attr("fill", "var(--text)")
          .text((d) => (d.name || d.label || d.id).slice(0, 3).toUpperCase());

        // Start invisible — updateInteractionStyles controls visibility
        g.style("opacity", 0);
        return g;
      },
      update => update,
      exit => exit.transition().duration(500).style("opacity", 0).remove()
    )
    .attr("transform", (d) => `translate(${d.drawX}, ${d.drawY})`)
    .attr("aria-label", (d) => `Pays ${d.name || d.label}`)
    .on("click", (_, d) => {
      state.focusId = state.focusId === d.id ? null : d.id;
      state.infoId = d.id;
      renderGraph();
      window.dispatchEvent(new CustomEvent('stateUpdated'));
    })
    .on("mouseenter", (event, d) => {
      hoveredCountryId = d.id;
      highlightTerritory(d.code, true);
      updateInteractionStyles(linkSelection, nodeSelection, labelSelection, clusterSelection, nodes, links);
      window.dispatchEvent(new CustomEvent('tooltipShow', { detail: { node: d, links, event } }));
    })
    .on("mousemove", (event) => {
      window.dispatchEvent(new CustomEvent('tooltipMove', { detail: { event } }));
    })
    .on("mouseleave", (_, d) => {
      hoveredCountryId = null;
      highlightTerritory(d.code, false);
      updateInteractionStyles(linkSelection, nodeSelection, labelSelection, clusterSelection, nodes, links);
      window.dispatchEvent(new CustomEvent('tooltipHide'));
    });

  const labelSelection = labelLayer.selectAll("text.country-label")
    .data(repeatedNodeData, (d) => `${d.id}-${d.copyIndex}`)
    .join(
      enter => enter.append("text")
        .attr("class", "country-label")
        .attr("fill", "var(--text)")
        .attr("font-size", 12)
        .attr("font-weight", 700)
        .attr("text-anchor", "middle")
        .style("pointer-events", "none")
        .style("opacity", 0)  // starts hidden, updateInteractionStyles controls this
        .text((d) => d.name || d.label),
      update => update,
      exit => exit.transition().duration(500).style("opacity", 0).remove()
    )
    .attr("transform", (d) => `translate(${d.drawX}, ${d.drawY})`);
  // Labels start hidden — updateInteractionStyles controls them

  applyZoomResponsiveStyles();
  lastSelections = { linkSelection, nodeSelection, labelSelection, clusterSelection };
  updateInteractionStyles(linkSelection, nodeSelection, labelSelection, clusterSelection, nodes, links);

  if (state.transform) {
    svg.call(zoomBehavior.transform, state.transform);
  }

  updateMinimap();
}

// Exported: zoom the map to a specific node by id
export function zoomToNode(nodeId, targetK = 4) {
  if (!svg || !projection || !zoomBehavior) return;
  const node = state.nodes.find(n => n.id === nodeId);
  if (!node) return;
  const proj = projection([node.lon ?? 0, node.lat ?? 0]);
  if (!proj) return;
  const [nx, ny] = proj;
  const W = graphWidth || 900;
  const H = graphHeight || 600;
  const tx = W / 2 - nx * targetK;
  const ty = H / 2 - ny * targetK;
  const transform = d3.zoomIdentity.translate(tx, ty).scale(targetK);
  state.transform = transform;
  svg.transition().duration(700).call(zoomBehavior.transform, transform);
}

function prepareProjectedNodes(rawNodes) {
  if (!projection) return [];
  return rawNodes.map((node) => {
    const lon = node.lon ?? 0;
    const lat = node.lat ?? 0;
    const proj = projection([lon, lat]);
    let x = proj ? proj[0] : 0;
    let y = proj ? proj[1] : 0;
    const name = node.name || node.label || node.id;
    return { ...node, name, code: (node.id && node.id.length === 2) ? node.id : node.code, x, y };
  });
}

function computeClusters(links) {
  const uf = new Map();
  function find(i) {
    if (!uf.has(i)) uf.set(i, i);
    if (uf.get(i) === i) return i;
    const root = find(uf.get(i));
    uf.set(i, root);
    return root;
  }
  function union(i, j) { uf.set(find(i), find(j)); }
  links.filter((l) => l.type === "alliance").forEach((link) => union(link.source.id, link.target.id));
  const groups = new Map();
  for (const key of uf.keys()) {
    const root = find(key);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(key);
  }
  return Array.from(groups.values()).filter((g) => g.length > 2);
}

function renderBaseMap() {
  if (!worldGeo) return;
  mapLayer.selectAll("path")
    .data(worldGeo.features)
    .join("path")
    .attr("class", "map-land")
    .attr("d", geoPath);
}

function renderTerritories(activeCodes, links, projectedByCode) {
  if (!worldGeo) return;

  const codesInConflict = new Set();
  links.filter((l) => l.type === "conflict" || l.type === "rivalry").forEach((l) => {
    if (l.source.code) codesInConflict.add(l.source.code);
    if (l.target.code) codesInConflict.add(l.target.code);
  });

  // Build set of active country node ids for territory mapping
  const activeNodeIds = new Set(lastRenderCache ? lastRenderCache.nodes.map(n => n.id) : []);

  territoryLayer.selectAll("path")
    .data(worldGeo.features)
    .join("path")
    .attr("class", "map-country")
    .classed("is-active", (d) => activeCodes.has(d.id))
    .classed("is-conflict", (d) => codesInConflict.has(d.id))
    .attr("d", geoPath)
    .attr("fill", (d) => {
      if (codesInConflict.has(d.id)) return "rgba(255, 89, 94, 0.12)";
      if (activeCodes.has(d.id)) return "rgba(255, 209, 102, 0.08)";
      return "rgba(255,255,255,0.02)";
    })
    .style("cursor", "pointer")
    .on("mouseenter", function(event, d) {
      const alpha2 = numericToAlpha.get(String(d.id));
      if (alpha2) {
        const node = lastRenderCache && lastRenderCache.nodes.find(n => n.id === alpha2 || n.code === alpha2);
        if (node) {
          hoveredCountryId = node.id;
          d3.select(this).classed("is-hovered", true);
          nodeLayer.selectAll("g.country-node")
            .filter(nd => nd.id === node.id)
            .classed("is-hovered", true)
            .style("opacity", 1); // Force show the icon on hover
          const { linkSelection, nodeSelection, labelSelection, clusterSelection } = lastSelections || {};
          if (nodeSelection) updateInteractionStyles(linkSelection, nodeSelection, labelSelection, clusterSelection, lastRenderCache.nodes, lastRenderCache.links);
          window.dispatchEvent(new CustomEvent('tooltipShow', { detail: { node, links: lastRenderCache.links, event } }));
        }
      }
    })
    .on("mousemove", (event) => {
      window.dispatchEvent(new CustomEvent('tooltipMove', { detail: { event } }));
    })
    .on("mouseleave", function(event, d) {
      hoveredCountryId = null;
      d3.select(this).classed("is-hovered", false);
      nodeLayer.selectAll("g.country-node.is-hovered").classed("is-hovered", false);
      const { linkSelection, nodeSelection, labelSelection, clusterSelection } = lastSelections || {};
      if (nodeSelection) updateInteractionStyles(linkSelection, nodeSelection, labelSelection, clusterSelection, lastRenderCache.nodes, lastRenderCache.links);
      window.dispatchEvent(new CustomEvent('tooltipHide'));
    })
    .on("click", (event, d) => {
      const alpha2 = numericToAlpha.get(String(d.id));
      if (alpha2) {
        const node = lastRenderCache && lastRenderCache.nodes.find(n => n.id === alpha2 || n.code === alpha2);
        if (node) {
          state.focusId = state.focusId === node.id ? null : node.id;
          state.infoId = node.id;
          renderGraph();
          window.dispatchEvent(new CustomEvent('stateUpdated'));
        }
      }
    });
}

function highlightTerritory(code, on) {
  if (!code) return;
  // find numeric id from alpha2
  const numericEntry = Object.entries(ISO_NUMERIC_TO_ALPHA2).find(([, v]) => v === code);
  if (!numericEntry) return;
  const numericId = numericEntry[0];
  territoryLayer.selectAll("path")
    .filter(d => String(d.id) === numericId)
    .classed("is-hovered", on);
}

function createArcPath(source, target) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
  return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`;
}

function applyZoomResponsiveStyles() {
  if (!state.transform) return;
  const k = state.transform.k;
  const r = 22 / Math.sqrt(k);
  nodeLayer.selectAll("circle").attr("r", r);
  nodeLayer.selectAll("image")
    .attr("width", r * 1.9)
    .attr("height", r * 1.35)
    .attr("x", -r * 0.95)
    .attr("y", -r * 0.68);
  labelLayer.selectAll("text")
    .attr("font-size", `${11 / Math.sqrt(k)}px`)
    .attr("dy", (r + 6));
}

function updateInteractionStyles(linkSel, nodeSel, labelSel, clusterSel, nodes, links) {
  const focus = state.focusId;
  const hover = hoveredCountryId;
  
  const activeNodeIds = new Set();
  if (focus) activeNodeIds.add(focus);
  if (hover) activeNodeIds.add(hover);
  links.forEach(l => {
    activeNodeIds.add(l.source.id);
    activeNodeIds.add(l.target.id);
  });

  // Si aucun scénario actif, aucun focus, aucun hover => tout cacher
  if (!state.activeScenario && !focus && !hover) {
    nodeSel.style("opacity", 0).style("pointer-events", "none").classed("is-hovered", false);
    labelSel.style("opacity", 0);
    linkSel.attr("opacity", 0);
    clusterSel.attr("opacity", 0);
    return;
  }

  nodeSel.style("pointer-events", (d) => activeNodeIds.has(d.id) ? "all" : "none")
         .classed("is-hovered", (d) => d.id === hover);

  const activeId = hover || focus;
  if (!activeId) {
    // Scénario actif, pas de hover/focus
    nodeSel.style("opacity", (d) => activeNodeIds.has(d.id) ? 1 : 0);
    labelSel.style("opacity", (d) => activeNodeIds.has(d.id) ? 0.9 : 0);
    linkSel.attr("opacity", 0.7);
    clusterSel.attr("opacity", 0.38);
    return;
  }

  const directNeighbors = new Set([activeId]);
  const activeLinks = new Set();
  getNeighborLinks(activeId, links).forEach((link) => {
    activeLinks.add(link.id);
    directNeighbors.add(link.source.id);
    directNeighbors.add(link.target.id);
  });

  nodeSel.style("opacity", (d) => directNeighbors.has(d.id) ? 1 : (activeNodeIds.has(d.id) ? 0.12 : 0));
  labelSel.style("opacity", (d) => directNeighbors.has(d.id) ? 1 : (activeNodeIds.has(d.id) ? 0.12 : 0));
  linkSel.attr("opacity", (d) => activeLinks.has(d.id) ? 1 : (state.activeScenario ? 0.04 : 0));
}

export function updateMinimap() {
  if (!worldGeo || !minimapSvg || !lastRenderCache) return;
  const mw = minimapSvg.node().parentNode.clientWidth;
  const mh = minimapSvg.node().parentNode.clientHeight;
  minimapSvg.attr("viewBox", `0 0 ${mw} ${mh}`);

  const miniProj = d3.geoEquirectangular().fitExtent([[2, 2], [mw - 2, mh - 2]], { type: "Sphere" });
  const miniPath = d3.geoPath(miniProj);

  minimapSvg.selectAll("*").remove();
  minimapSvg.append("path").datum({ type: "Sphere" }).attr("fill", "var(--bg)").attr("d", miniPath);
  minimapSvg.append("g").selectAll("path").data(worldGeo.features).join("path")
    .attr("fill", state.darkMode ? "#1a2a40" : "#d1d5db")
    .attr("stroke", "rgba(0,0,0,0.1)")
    .attr("d", miniPath);

  const mNodes = lastRenderCache.nodes.map((n) => {
    const proj = miniProj([n.lon ?? 0, n.lat ?? 0]);
    return { ...n, x: proj ? proj[0] : 0, y: proj ? proj[1] : 0 };
  });
  const mNodesMap = new Map(mNodes.map((n) => [n.id, n]));
  const mLinks = lastRenderCache.links.map((l) => ({
    ...l,
    source: mNodesMap.get(l.source.id),
    target: mNodesMap.get(l.target.id)
  })).filter(l => l.source && l.target);

  minimapSvg.append("g").selectAll("path").data(mLinks).join("path")
    .attr("d", (d) => createArcPath({ x: d.source.x, y: d.source.y }, { x: d.target.x, y: d.target.y }))
    .attr("stroke", (d) => getColor(d.type))
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", (d) => RELATION_TYPES[d.type] ? RELATION_TYPES[d.type].dash : "0")
    .attr("fill", "none")
    .attr("opacity", 0.4);

  minimapSvg.append("g").selectAll("circle").data(mNodes).join("circle")
    .attr("cx", (d) => d.x).attr("cy", (d) => d.y)
    .attr("r", 2)
    .attr("fill", "var(--text)");

  if (state.transform && graphWidth && projection) {
    const scale = state.transform.k;
    const invProj0 = projection.invert([-state.transform.x / scale, -state.transform.y / scale]);
    const invProj1 = projection.invert([(graphWidth - state.transform.x) / scale, (graphHeight - state.transform.y) / scale]);

    if (invProj0 && invProj1) {
      const p0 = miniProj(invProj0);
      const p1 = miniProj(invProj1);
      if (p0 && p1) {
        minimapSvg.append("rect")
          .attr("x", p0[0]).attr("y", p0[1])
          .attr("width", p1[0] - p0[0]).attr("height", p1[1] - p0[1])
          .attr("fill", "none").attr("stroke", "var(--accent)").attr("stroke-width", 1.5);
      }
    }
  }
}
