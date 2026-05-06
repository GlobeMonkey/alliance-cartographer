import { state, setRelationTypes, sanitizeNode, sanitizeLink } from './store.js';

export let worldGeo = null;

export let loadError = null;

export async function loadData() {
  loadError = null;
  try {
    const bust = `?v=${Date.now()}`;
    const [worldRes, topoRes] = await Promise.all([
      fetch(`./data/world.json${bust}`),
      fetch('./data/countries-110m.json')
    ]);

    if (!worldRes.ok) {
      loadError = `Impossible de charger world.json (HTTP ${worldRes.status}).`;
      throw new Error(loadError);
    }
    if (!topoRes.ok) {
      loadError = `Impossible de charger countries-110m.json (HTTP ${topoRes.status}).`;
      throw new Error(loadError);
    }

    let worldData, topoData;
    try {
      [worldData, topoData] = await Promise.all([worldRes.json(), topoRes.json()]);
    } catch {
      loadError = 'JSON invalide dans world.json ou countries-110m.json.';
      throw new Error(loadError);
    }

    if (!worldData.nodes || !worldData.edges || !worldData.relationTypes) {
      loadError = 'world.json : structure invalide (nodes / edges / relationTypes manquants).';
      throw new Error(loadError);
    }

    setRelationTypes(worldData.relationTypes);
    state.nodes = worldData.nodes.map(n => sanitizeNode(n, n));
    state.links = worldData.edges.map(sanitizeLink);

    worldGeo = topojson.feature(topoData, topoData.objects.countries);

    return worldData;
  } catch (error) {
    console.error("Erreur d'initialisation des données :", error);
    return null;
  }
}
