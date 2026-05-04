const fs = require('fs');
const path = require('path');

const htmlContent = fs.readFileSync('index.html', 'utf8');

// Extraction grossière mais efficace via regex ou substring
function extractVariable(name) {
  const regex = new RegExp(`const\\s+${name}\\s*=\\s*(\\{[\\s\\S]*?\\n\\s*\\});\\n`);
  const match = htmlContent.match(regex);
  if (match) {
    // Evaluation in a safe local scope
    try {
      // Use Function constructor instead of eval
      return new Function(`return ${match[1]}`)();
    } catch (e) {
      console.error(`Error parsing ${name}:`, e);
      return null;
    }
  }
  return null;
}

const RELATION_TYPES = extractVariable('RELATION_TYPES');
const COUNTRY_INFO = extractVariable('COUNTRY_INFO');

// Scenarios uses geoNode which we need to mock
const scenariosRegex = /const\s+scenarios\s*=\s*(\{[\s\S]*?\});\n\s*const\s+scenarioGroups/m;
const scenariosMatch = htmlContent.match(scenariosRegex);

let scenarios = {};
if (scenariosMatch) {
  try {
    const geoNode = (name, code, lon, lat) => ({ name, code, lon, lat });
    scenarios = new Function('geoNode', `return ${scenariosMatch[1]}`)(geoNode);
  } catch (e) {
    console.error('Error parsing scenarios:', e);
  }
}

// Convert to new schema
const worldData = {
  relationTypes: RELATION_TYPES,
  nodes: [],
  edges: []
};

// Process all countries from COUNTRY_INFO
const nodeMap = new Map();

if (COUNTRY_INFO) {
  for (const [code, info] of Object.entries(COUNTRY_INFO)) {
    const node = {
      id: code,
      label: info.name || code,
      type: "country",
      region: info.region,
      regime: info.regime,
      population: info.population,
      gdp: info.gdp,
      lon: info.lon,
      lat: info.lat
    };
    worldData.nodes.push(node);
    nodeMap.set(code, node);
  }
}

// Add nodes from scenarios that might not be in COUNTRY_INFO (e.g. NATO)
if (scenarios) {
  for (const [scenarioName, scenarioData] of Object.entries(scenarios)) {
    scenarioData.nodes.forEach(n => {
      const id = n.code || n.id;
      if (!nodeMap.has(id)) {
        const node = {
          id: id,
          label: n.name || id,
          type: "organization",
          lon: n.lon,
          lat: n.lat
        };
        worldData.nodes.push(node);
        nodeMap.set(id, node);
      }
    });

    // Add edges
    // The previous app had all relations combined.
    // Let's add them to the global edges array if they are unique.
    scenarioData.links.forEach(link => {
      const [source, target, type, strength, since, until] = link;
      const edgeId = `${source}-${target}-${type}`;
      // Just push them all, we'll let the app filter
      worldData.edges.push({
        source,
        target,
        type,
        strength: strength || 1,
        since: since || 1945,
        until: until || 2035,
        scenario: scenarioName // Tag it so we know where it came from
      });
    });
  }
}

// Deduplicate edges (some scenarios might have duplicated links)
const uniqueEdgesMap = new Map();
worldData.edges.forEach(edge => {
  const key = `${edge.source}-${edge.target}-${edge.type}-${edge.since}-${edge.until}`;
  if (!uniqueEdgesMap.has(key)) {
    uniqueEdgesMap.set(key, edge);
  }
});
worldData.edges = Array.from(uniqueEdgesMap.values());

if (!fs.existsSync('data')) {
  fs.mkdirSync('data');
}

fs.writeFileSync('data/world.json', JSON.stringify(worldData, null, 2), 'utf8');
console.log('Successfully created data/world.json');
