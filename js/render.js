import { state, getColor, RELATION_TYPES, getVisibleGraph, getNeighborLinks } from './store.js';
import { worldGeo } from './data-loader.js';
import { getFlagUrl } from './utils.js';

let svg, mainLayer, mapLayer, territoryLayer, relationArcLayer, allianceArcLayer, linkLayer, clusterLayer, nodeLayer, labelLayer, badgeLayer;
let minimapSvg, zoomBehavior, projection, geoPath;

// ── Alliance layer state ─────────────────────────────────────────────────────
let _allianceData = null;
let _visibleAllianceIds = new Set();
let _allyHighlights = new Map(); // CCA2 → rgba color string
let _cca2ToCca3 = {};

// ── Relation layer state ─────────────────────────────────────────────────────
let _relationsData = null;
let _visibleRelationTypes = new Set(); // empty = all hidden
let _highlightedCca3 = null;
let _relationHighlights = new Map(); // CCA2 → rgba color string
let _cca3ToCca2 = {}; // CCA3 → CCA2 (forward map)
let graphWidth = 0, graphHeight = 0;
let worldWrapWidth = 0;
let lastRenderCache = null;
let lastSelections = null;
let hoveredCountryId = null;
// Map from ISO numeric code (TopoJSON) to our node id (ISO alpha-2)
let numericToAlpha = new Map();

const CLUSTER_COLORS = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#f15bb5"];

// ISO numeric → alpha-2 lookup table (all UN members + territories)
const ISO_NUMERIC_TO_ALPHA2 = {
  "260":"TF",
  "4":"AF","8":"AL","12":"DZ","16":"AS","20":"AD","24":"AO","28":"AG","31":"AZ",
  "32":"AR","36":"AU","40":"AT","44":"BS","48":"BH","50":"BD","51":"AM","52":"BB",
  "56":"BE","60":"BM","64":"BT","68":"BO","70":"BA","72":"BW","76":"BR","84":"BZ",
  "90":"SB","96":"BN","100":"BG","104":"MM","108":"BI","112":"BY","116":"KH","417":"KG",
  "120":"CM","124":"CA","132":"CV","136":"KY","140":"CF","144":"LK","148":"TD",
  "152":"CL","156":"CN","158":"TW","170":"CO","174":"KM","178":"CG","180":"CD",
  "188":"CR","191":"HR","192":"CU","196":"CY","203":"CZ","204":"BJ","208":"DK",
  "212":"DM","214":"DO","218":"EC","222":"SV","226":"GQ","231":"ET","232":"ER",
  "233":"EE","238":"FK","242":"FJ","246":"FI","250":"FR","258":"PF","262":"DJ",
  "266":"GA","268":"GE","270":"GM","275":"PS","276":"DE","288":"GH","292":"GI",
  "296":"KI","300":"GR","304":"GL","308":"GD","316":"GU","320":"GT","324":"GN",
  "328":"GY","332":"HT","340":"HN","344":"HK","348":"HU","352":"IS","356":"IN",
  "360":"ID","364":"IR","368":"IQ","372":"IE","376":"IL","380":"IT","384":"CI",
  "388":"JM","392":"JP","398":"KZ","400":"JO","404":"KE","408":"KP","410":"KR",
  "414":"KW","417":"KG","418":"LA","422":"LB","426":"LS","428":"LV","430":"LR","434":"LY",
  "438":"LI","440":"LT","442":"LU","446":"MO","450":"MG","454":"MW","458":"MY",
  "462":"MV","466":"ML","470":"MT","478":"MR","480":"MU","484":"MX","492":"MC",
  "496":"MN","498":"MD","499":"ME","504":"MA","508":"MZ","512":"OM","516":"NA",
  "520":"NR","524":"NP","528":"NL","533":"AW","540":"NC","548":"VU","554":"NZ",
  "558":"NI","562":"NE","566":"NG","570":"NU","578":"NO","583":"FM","584":"MH",
  "585":"PW","586":"PK","591":"PA","598":"PG","600":"PY","604":"PE","608":"PH",
  "616":"PL","620":"PT","624":"GW","626":"TL","630":"PR","634":"QA","638":"RE",
  "642":"RO","643":"RU","646":"RW","659":"KN","662":"LC","670":"VC","674":"SM",
  "678":"ST","682":"SA","686":"SN","688":"RS","690":"SC","694":"SL","702":"SG","703":"SK",
  "704":"VN","705":"SI","706":"SO","710":"ZA","716":"ZW","724":"ES","728":"SS",
  "729":"SD","732":"EH","740":"SR","748":"SZ","752":"SE","756":"CH","760":"SY",
  "762":"TJ","764":"TH","768":"TG","776":"TO","780":"TT","784":"AE","788":"TN",
  "792":"TR","795":"TM","798":"TV","800":"UG","804":"UA","818":"EG","826":"GB",
  "834":"TZ","840":"US","854":"BF","858":"UY","860":"UZ","862":"VE","882":"WS","887":"YE",
  "894":"ZM","383":"XK"
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
  // Relation arcs sit above territories, alliance arcs above relation arcs
  allianceArcLayer = mainLayer.insert("g", ".link-layer")
    .attr("class", "alliance-arc-layer")
    .style("pointer-events", "none");
  relationArcLayer = mainLayer.insert("g", ".alliance-arc-layer")
    .attr("class", "relation-arc-layer")
    .style("pointer-events", "none");
  badgeLayer = mainLayer.append("g").attr("class", "badge-layer").style("pointer-events", "none");
  labelLayer = mainLayer.append("g").attr("class", "label-layer");

  // Build numeric → alpha-2 map for quick lookups on territory hover
  numericToAlpha = new Map(Object.entries(ISO_NUMERIC_TO_ALPHA2));

  zoomBehavior = d3.zoom()
    .scaleExtent([0.5, 12])
    .on("zoom", (event) => {
      const t = event.transform;
      let displayX = t.x;
      if (worldWrapWidth && t.k) {
        const period = worldWrapWidth * t.k;
        displayX = ((t.x % period) + period) % period;
        if (displayX > period / 2) displayX -= period;
      }
      state.transform = t;
      mainLayer.attr("transform", d3.zoomIdentity.translate(displayX, t.y).scale(t.k));
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
      const normId = String(parseInt(f.id, 10));
      const knownAlpha2 = ISO_NUMERIC_TO_ALPHA2[normId] || custom[name] || null;
      const alpha2 = knownAlpha2 || normId;
      const nLow = name.toLowerCase();
      let node = state.nodes.find(n => n.id === alpha2 || n.code === alpha2 || (n.name && n.name.toLowerCase() === nLow) || (n.label && n.label.toLowerCase() === nLow));
      if (!node) {
        const centroid = d3.geoCentroid(f);
        // code only set when alpha-2 comes from a verified lookup — avoids requesting flags for non-ISO string IDs
        node = { id: alpha2, name: name, label: name, code: knownAlpha2, type: "country", region: "N/A", regime: "N/A", population: "N/A", gdp: "N/A", lon: centroid[0], lat: centroid[1] };
        state.nodes.push(node);
      }
      numericToAlpha.set(normId, node.id);
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
  renderTerritories(new Set(nodes.map(n => n.code).filter(Boolean)), links, projectedByCode, nodes);

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
    .classed("is-conflict-active", (d) => d.type === "conflict" || d.type === "rivalry")
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      if (d.copyIndex !== 0) return; // only handle primary copy
      event.stopPropagation();
      state.focusId = null;
      state.infoId = null;
      window.dispatchEvent(new CustomEvent('edgeSelected', { detail: d }));
    });

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

        // A flag URL exists when either a 2-letter ISO code is set, or the id has
        // a custom local SVG flag (X-prefix codes like XNC, XRJ).
        const flagFor = (d) => getFlagUrl(d.code || d.id);
        const hasFlag = (d) => !!flagFor(d);

        // Circle + text fallback for nodes without any resolvable flag
        g.filter((d) => !hasFlag(d))
          .append("circle")
          .attr("r", 20)
          .attr("fill", "rgba(8,16,26,0.75)")
          .attr("stroke", (d) => d.type === "unrecognized" ? "rgba(255,200,50,0.6)" : "none")
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", (d) => d.type === "unrecognized" ? "4,2" : "0");

        // Flag image for nodes with a resolvable flag (ISO or custom)
        g.filter(hasFlag)
          .append("image")
          .attr("href", flagFor)
          .attr("x", -21).attr("y", -15)
          .attr("width", 42).attr("height", 30)
          .attr("preserveAspectRatio", "xMidYMid slice")
          .style("clip-path", "inset(0 round 10px)")
          .style("filter", (d) => d.type === "unrecognized" ? "grayscale(0.5) opacity(0.75)" : null)
          .on("error", function(event, d) {
            const parent = this.parentNode;
            d3.select(this).remove();
            d3.select(parent).append("text")
              .attr("text-anchor", "middle").attr("dy", 5).attr("font-size", 10)
              .attr("fill", "var(--text)")
              .text((d.name || d.id || "").slice(0, 3).toUpperCase());
          });

        // Fallback text for entities without a flag
        g.filter((d) => !hasFlag(d))
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
      if (d.copyIndex !== 0) return;
      if (state.compareMode) {
        const ids = state.compareIds.filter(id => id !== d.id);
        state.compareIds = [...ids.slice(-1), d.id];
        window.dispatchEvent(new CustomEvent('compareUpdated'));
        return;
      }
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

  renderConflictBadges(nodes, links);
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

// Territories visually merged into their parent state by default (annexed/de-facto controlled).
// When focused, these show a dotted border to indicate their non-recognized status.
const UNRECOGNIZED_TERRITORY_CODES = new Set(["EH"]);

function renderBaseMap() {
  if (!worldGeo) return;
  mapLayer.selectAll("g.map-copy")
    .data([-1, 0, 1])
    .join("g")
    .attr("class", "map-copy")
    .attr("transform", d => `translate(${d * worldWrapWidth}, 0)`)
    .selectAll("path")
    .data(worldGeo.features)
    .join("path")
    .attr("class", "map-land")
    .classed("is-unrecognized-border", d => {
      if (d.id == null) return false;
      const a = numericToAlpha.get(String(parseInt(d.id, 10)));
      return UNRECOGNIZED_TERRITORY_CODES.has(a) && a !== state.focusId;
    })
    .attr("d", geoPath);
}

function renderTerritories(activeCodes, links, projectedByCode, nodes) {
  if (!worldGeo) return;

  const codesInConflict = new Set();
  links.filter((l) => l.type === "conflict" || l.type === "rivalry").forEach((l) => {
    if (l.source.code) codesInConflict.add(l.source.code);
    if (l.target.code) codesInConflict.add(l.target.code);
  });

  const heatmapMap = state.heatmapIndicator
    ? buildHeatmapColorMap(nodes || [], links, state.heatmapIndicator)
    : null;

  territoryLayer.selectAll("g.territory-copy")
    .data([-1, 0, 1])
    .join("g")
    .attr("class", "territory-copy")
    .attr("transform", d => `translate(${d * worldWrapWidth}, 0)`)
    .selectAll("path")
    .data(worldGeo.features)
    .join("path")
    .attr("class", "map-country")
    .classed("is-active",   (d) => { const a = numericToAlpha.get(String(parseInt(d.id, 10))); return a && activeCodes.has(a); })
    .classed("is-conflict", (d) => { const a = numericToAlpha.get(String(parseInt(d.id, 10))); return a && codesInConflict.has(a); })
    .classed("is-focused",  (d) => { const a = numericToAlpha.get(String(parseInt(d.id, 10))); return a === state.focusId; })
    .classed("is-unrecognized-border", (d) => {
      if (d.id == null) return false;
      const a = numericToAlpha.get(String(parseInt(d.id, 10)));
      return UNRECOGNIZED_TERRITORY_CODES.has(a) && a !== state.focusId;
    })
    .classed("is-unrecognized-focused", (d) => {
      if (d.id == null) return false;
      const a = numericToAlpha.get(String(parseInt(d.id, 10)));
      return UNRECOGNIZED_TERRITORY_CODES.has(a) && a === state.focusId;
    })
    .attr("d", geoPath)
    .attr("fill", (d) => {
      const a = numericToAlpha.get(String(parseInt(d.id, 10)));
      // Unrecognized territories are invisible (merged into surrounding country) unless focused
      if (a && UNRECOGNIZED_TERRITORY_CODES.has(a) && a !== state.focusId) return "rgba(0,0,0,0)";
      if (heatmapMap && a) {
        const col = heatmapMap.get(a);
        if (col) return col;
      }
      if (a && _relationHighlights.has(a)) return _relationHighlights.get(a);
      if (a && _allyHighlights.has(a))    return _allyHighlights.get(a);
      if (a && a === state.focusId)       return "rgba(96, 165, 250, 0.28)";
      if (a && codesInConflict.has(a))    return "rgba(255, 89, 94, 0.12)";
      if (a && activeCodes.has(a))        return "rgba(255, 209, 102, 0.08)";
      return "rgba(255,255,255,0.02)";
    })
    .style("cursor", "pointer")
    .on("mouseenter", function(event, d) {
      const alpha2 = numericToAlpha.get(String(parseInt(d.id, 10)));
      if (alpha2) {
        const node = lastRenderCache && lastRenderCache.nodes.find(n => n.id === alpha2 || n.code === alpha2);
        if (node) {
          hoveredCountryId = node.id;
          d3.select(this).classed("is-hovered", true);
          nodeLayer.selectAll("g.country-node")
            .filter(nd => nd.id === node.id && nd.copyIndex === 0)
            .classed("is-hovered", true)
            .style("opacity", 1);
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
      const alpha2 = numericToAlpha.get(String(parseInt(d.id, 10)));
      if (alpha2) {
        const node = lastRenderCache && lastRenderCache.nodes.find(n => n.id === alpha2 || n.code === alpha2);
        if (node) {
          if (state.compareMode) {
            const ids = state.compareIds.filter(id => id !== node.id);
            state.compareIds = [...ids.slice(-1), node.id];
            window.dispatchEvent(new CustomEvent('compareUpdated'));
            return;
          }
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
  const numericEntry = Object.entries(ISO_NUMERIC_TO_ALPHA2).find(([, v]) => v === code);
  if (!numericEntry) return;
  const normNumericId = String(parseInt(numericEntry[0], 10));
  territoryLayer.selectAll("path")
    .filter(d => String(parseInt(d.id, 10)) === normNumericId)
    .classed("is-hovered", on);
}

function buildHeatmapColorMap(nodes, links, indicator) {
  let valFn;
  if (indicator === 'gdp') {
    valFn = n => {
      if (!n.gdp || n.gdp === 'N/A') return null;
      const v = parseFloat(String(n.gdp).replace(/\s/g, '').replace(',', '.'));
      return isNaN(v) ? null : v;
    };
  } else if (indicator === 'pop') {
    valFn = n => {
      if (!n.population || n.population === 'N/A') return null;
      const v = parseFloat(String(n.population).replace(/\s/g, '').replace(',', '.'));
      return isNaN(v) ? null : v;
    };
  } else if (indicator === 'conflict') {
    const cnt = new Map();
    links.filter(l => l.type === 'conflict' || l.type === 'rivalry').forEach(l => {
      cnt.set(l.source.id, (cnt.get(l.source.id) || 0) + 1);
      cnt.set(l.target.id, (cnt.get(l.target.id) || 0) + 1);
    });
    valFn = n => cnt.get(n.id) || 0;
  }
  if (!valFn) return null;

  const entries = nodes.map(n => [n.id, valFn(n)]).filter(([, v]) => v !== null && v > 0);
  if (!entries.length) return null;
  const vals = entries.map(([, v]) => v);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  // YlOrRd-like stops: yellow → orange → red
  const stops = ['#ffffb2','#fecc5c','#fd8d3c','#f03b20','#bd0026'];
  function lerp(a, b, t) {
    const ah = parseInt(a.slice(1,3),16), am = parseInt(a.slice(3,5),16), al = parseInt(a.slice(5,7),16);
    const bh = parseInt(b.slice(1,3),16), bm = parseInt(b.slice(3,5),16), bl = parseInt(b.slice(5,7),16);
    return `rgb(${Math.round(ah+(bh-ah)*t)},${Math.round(am+(bm-am)*t)},${Math.round(al+(bl-al)*t)})`;
  }
  function colorScale(v) {
    const pct = (v - minV) / range;
    const i = Math.min(Math.floor(pct * (stops.length - 1)), stops.length - 2);
    const t = pct * (stops.length - 1) - i;
    return lerp(stops[i], stops[i+1], t);
  }

  const colorMap = new Map(entries.map(([id, v]) => [id, colorScale(v)]));
  window.dispatchEvent(new CustomEvent('heatmapComputed', { detail: { indicator, minV, maxV } }));
  return colorMap;
}

function renderConflictBadges(nodes, links) {
  if (!badgeLayer) return;
  const conflictIds = new Set(
    links.filter(l => l.type === 'conflict')
      .flatMap(l => [l.source.id, l.target.id])
  );
  const badgeData = nodes.filter(n => conflictIds.has(n.id));
  badgeLayer.selectAll("g.conflict-badge")
    .data(badgeData, d => d.id)
    .join(
      enter => {
        const g = enter.append("g").attr("class", "conflict-badge");
        g.append("circle").attr("r", 5.5).attr("fill", "#ef4444")
          .attr("stroke", "rgba(0,0,0,0.5)").attr("stroke-width", 1.5)
          .attr("class", "conflict-pulse");
        return g;
      },
      update => update,
      exit => exit.remove()
    )
    .attr("transform", d => `translate(${d.x + 14}, ${d.y - 14})`);
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
  const r = 24 / k;
  nodeLayer.selectAll("circle").attr("r", r);
  nodeLayer.selectAll("image")
    .attr("width", r * 1.9)
    .attr("height", r * 1.35)
    .attr("x", -r * 0.95)
    .attr("y", -r * 0.68);
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

  labelSel.style("opacity", 0);

  // Aucun scénario, aucun focus, aucun hover → tout masqué
  if (!state.activeScenario && !focus && !hover) {
    nodeSel.style("opacity", 0)
           .style("pointer-events", (d) => d.copyIndex === 0 ? "all" : "none")
           .classed("is-hovered", false);
    linkSel.attr("opacity", 0);
    clusterSel.attr("opacity", 0);
    return;
  }

  updateAllianceArcHighlight();
  nodeSel.style("pointer-events", (d) => activeNodeIds.has(d.id) && d.copyIndex === 0 ? "all" : "none")
         .classed("is-hovered", (d) => d.id === hover && d.copyIndex === 0);

  const activeId = hover || focus;
  if (!activeId) {
    // Scénario actif, pas de hover/focus
    nodeSel.style("opacity", (d) => activeNodeIds.has(d.id) && d.copyIndex === 0 ? 1 : 0);
    linkSel.attr("opacity", (d) => d.copyIndex === 0 ? 0.7 : 0);
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

  nodeSel.style("opacity", (d) => {
    if (d.copyIndex !== 0) return 0;
    if (directNeighbors.has(d.id)) return 1;
    if (activeNodeIds.has(d.id)) return 0.15;
    return 0;
  });
  linkSel.attr("opacity", (d) => {
    if (d.copyIndex !== 0) return 0;
    if (activeLinks.has(d.id)) return 1;
    return state.activeScenario ? 0.04 : 0;
  });
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

// ── Alliance arc layer ───────────────────────────────────────────────────────

export function initAllianceLayer(cca3ToCca2) {
  _cca3ToCca2 = cca3ToCca2 || {};
  _cca2ToCca3 = {};
  for (const [cca3, cca2] of Object.entries(_cca3ToCca2)) {
    _cca2ToCca3[cca2] = cca3;
  }
}

export function setAllianceData(data) {
  _allianceData = data;
  renderAllianceArcs();
}

export function toggleAllianceVisibility(id, visible) {
  visible ? _visibleAllianceIds.add(id) : _visibleAllianceIds.delete(id);
  renderAllianceArcs();
}

export function setAllyHighlights(highlights) {
  // highlights: Array of { cca2: string, color: string }
  _allyHighlights = new Map(highlights.map(h => [h.cca2, h.color]));
  _redrawTerritories();
}

export function clearAllyHighlights() {
  _allyHighlights = new Map();
  _redrawTerritories();
}

function _redrawTerritories() {
  if (!lastRenderCache) return;
  const { nodes, links, projectedByCode } = lastRenderCache;
  renderTerritories(
    new Set(nodes.map(n => n.code).filter(Boolean)),
    links,
    projectedByCode,
    nodes
  );
}

function renderAllianceArcs() {
  if (!allianceArcLayer || !_allianceData) return;
  allianceArcLayer.selectAll("*").remove();
  if (!_visibleAllianceIds.size || !projection) return;

  const { alliances, links: allLinks, capitals } = _allianceData;

  for (const alliance of alliances) {
    if (!_visibleAllianceIds.has(alliance.id)) continue;
    const arcs = allLinks.filter(l => l.alliance === alliance.id);
    if (!arcs.length) continue;

    const g = allianceArcLayer.append("g")
      .attr("class", `alliance-group alliance-group-${alliance.id}`)
      .attr("data-alliance", alliance.id);

    g.selectAll("path")
      .data(arcs)
      .join("path")
      .attr("class", "alliance-arc")
      .attr("d", d => {
        const sc = capitals[d.source];
        const tc = capitals[d.target];
        if (!sc || !tc) return null;
        const ps = projection([sc.lng, sc.lat]);
        const pt = projection([tc.lng, tc.lat]);
        if (!ps || !pt) return null;
        const dx = pt[0] - ps[0], dy = pt[1] - ps[1];
        const dr = Math.sqrt(dx * dx + dy * dy) * 0.7;
        return `M${ps[0]},${ps[1]}A${dr},${dr} 0 0,1 ${pt[0]},${pt[1]}`;
      })
      .attr("stroke", alliance.color)
      .attr("stroke-width", d => d.strength >= 1.0 ? 2 : d.strength >= 0.7 ? 1.5 : 1)
      .attr("fill", "none")
      .attr("stroke-opacity", 0.3)
      .attr("stroke-linecap", "round");
  }

  updateAllianceArcHighlight();
}

function updateAllianceArcHighlight() {
  if (!allianceArcLayer || !_allianceData) return;

  const activeCca2 = hoveredCountryId || state.focusId;
  const activeCca3 = activeCca2 ? _cca2ToCca3[activeCca2] : null;

  if (!activeCca3) {
    allianceArcLayer.selectAll("path.alliance-arc").attr("stroke-opacity", 0.3);
    return;
  }

  const memberAllianceIds = new Set(
    _allianceData.alliances
      .filter(a => a.members.includes(activeCca3))
      .map(a => a.id)
  );

  allianceArcLayer.selectAll("g.alliance-group").each(function() {
    const aid = d3.select(this).attr("data-alliance");
    d3.select(this).selectAll("path.alliance-arc")
      .attr("stroke-opacity", memberAllianceIds.has(aid) ? 0.85 : 0.05);
  });
}

// ── Relation arc layer ───────────────────────────────────────────────────────

const REL_STYLE = {
  ally:    { color: "#4a90d9", dash: "0",   opacity: 0.70 },
  partner: { color: "#27ae60", dash: "0",   opacity: 0.50 },
  neutral: { color: "#95a5a6", dash: "2,4", opacity: 0.50 },
  rival:   { color: "#e67e22", dash: "6,3", opacity: 0.90 },
  conflict:{ color: "#e74c3c", dash: "3,2", opacity: 0.90 },
};

const REL_HIGHLIGHT_COLOR = {
  ally:    "rgba(74,144,217,0.30)",
  partner: "rgba(39,174,96,0.25)",
  neutral: "rgba(149,165,166,0.15)",
  rival:   "rgba(230,126,34,0.25)",
  conflict:"rgba(231,76,60,0.30)",
};

export function showRelationArcs(enabled) {
  if (!relationArcLayer) return;
  relationArcLayer.style("display", enabled ? null : "none");
}

export function toggleRelationType(type, enabled) {
  enabled ? _visibleRelationTypes.add(type) : _visibleRelationTypes.delete(type);
  renderRelationArcs();
}

export function highlightCountryRelations(cca3, relData) {
  _highlightedCca3 = cca3 || null;
  _relationHighlights = new Map();

  if (relData && cca3) {
    for (const r of (relData.relations || [])) {
      if (r.source !== cca3 && r.target !== cca3) continue;
      const pCca3 = r.source === cca3 ? r.target : r.source;
      const cca2  = _cca3ToCca2[pCca3];
      if (cca2) _relationHighlights.set(cca2, REL_HIGHLIGHT_COLOR[r.type] || "rgba(149,165,166,0.15)");
    }
  }

  _redrawTerritories();
  _updateRelationArcHighlight();
}

export function clearRelationHighlights() {
  _highlightedCca3 = null;
  _relationHighlights = new Map();
  _redrawTerritories();
  _updateRelationArcHighlight();
}

export function setRelationsData(data) {
  _relationsData = data;
}

function renderRelationArcs() {
  if (!relationArcLayer) return;
  relationArcLayer.selectAll("*").remove();
  if (!_relationsData || !_visibleRelationTypes.size || !projection) return;

  const capitals = _allianceData ? _allianceData.capitals : null;
  if (!capitals) return;

  const rels = (_relationsData.relations || []).filter(r => _visibleRelationTypes.has(r.type));

  for (const r of rels) {
    const sc = capitals[r.source];
    const tc = capitals[r.target];
    if (!sc || !tc) continue;
    const ps = projection([sc.lng, sc.lat]);
    const pt = projection([tc.lng, tc.lat]);
    if (!ps || !pt) continue;

    const dx = pt[0] - ps[0], dy = pt[1] - ps[1];
    const dr = Math.sqrt(dx * dx + dy * dy) * 0.7;
    const style = REL_STYLE[r.type] || REL_STYLE.neutral;
    const sw = Math.max(0.5, Math.min(3, Math.abs(r.strength) * 2));

    relationArcLayer.append("path")
      .attr("class", `relation-arc relation-arc-${r.type}`)
      .attr("data-source", r.source)
      .attr("data-target", r.target)
      .attr("d", `M${ps[0]},${ps[1]}A${dr},${dr} 0 0,1 ${pt[0]},${pt[1]}`)
      .attr("stroke", style.color)
      .attr("stroke-width", sw)
      .attr("stroke-dasharray", style.dash)
      .attr("stroke-opacity", style.opacity)
      .attr("stroke-linecap", "round")
      .attr("fill", "none");
  }

  _updateRelationArcHighlight();
}

function _updateRelationArcHighlight() {
  if (!relationArcLayer) return;
  if (!_highlightedCca3) {
    relationArcLayer.selectAll("path.relation-arc").attr("stroke-opacity", d => {
      // d is not bound — opacity from initial render is fine; reset by type
      return null; // restore attribute set during render
    });
    // Re-apply per-type opacity instead of null (null removes attribute)
    relationArcLayer.selectAll("path.relation-arc").each(function() {
      const cls = [...this.classList].find(c => c.startsWith("relation-arc-") && c !== "relation-arc");
      const type = cls ? cls.replace("relation-arc-", "") : "neutral";
      d3.select(this).attr("stroke-opacity", (REL_STYLE[type] || REL_STYLE.neutral).opacity);
    });
    return;
  }

  relationArcLayer.selectAll("path.relation-arc").each(function() {
    const src = this.dataset.source;
    const tgt = this.dataset.target;
    const active = src === _highlightedCca3 || tgt === _highlightedCca3;
    const cls = [...this.classList].find(c => c.startsWith("relation-arc-") && c !== "relation-arc");
    const type = cls ? cls.replace("relation-arc-", "") : "neutral";
    const baseOp = (REL_STYLE[type] || REL_STYLE.neutral).opacity;
    d3.select(this).attr("stroke-opacity", active ? baseOp : 0.04);
  });
}
