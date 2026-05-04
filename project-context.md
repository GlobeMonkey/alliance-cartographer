# Alliance Cartographer — Contexte Projet

## Description
Application web de cartographie géopolitique. Permet de visualiser les alliances, rivalités et basculements diplomatiques dans le temps sous forme de graphe interactif.

## Stack technique
- HTML5 / CSS3 / Vanilla JS (pas de framework)
- D3.js v7 (graphe de force, SVG, zoom, minimap)
- TopoJSON (fond de carte mondial)
- Fichier unique : index.html (autoportant, ~2300 lignes)

## Fonctionnalités actuelles
- Graphe de force avec nœuds (pays) et liens (relations diplomatiques)
- 5 types de relations : alliance, partenariat, neutralité, rivalité, conflit
- Fond de carte géographique SVG (world-atlas TopoJSON)
- Timeline avec slider (1945–2026) — les relations hors plage disparaissent
- Scénarios préconfigurés groupés :
  - Géopolitique (OTAN, UE, BRICS+, OET, Indo-Pacifique, Moyen-Orient)
  - Religions (Christianisme, Islam, Bouddhisme, Hindouisme, Judaïsme et leurs sous-branches)
- Mode clair / sombre
- Panneau latéral : légende, stats d'influence (PageRank-like), clusters d'alliés, focus pays, fiche pays
- Minimap interactive en bas à droite
- Export JSON (état complet) et export PNG
- Partage par URL (état encodé en base64 dans le hash)
- Drapeaux pays via flagcdn.com
- World wrap horizontal (carte continue)

## Structure des données
```js
// Nœud
{ id, name, code (ISO 3166-1 alpha-2), lon, lat, x, y }

// Lien
{ id, source, target, type (alliance|partnership|neutral|rivalry|conflict), intensity (1-5), startYear, endYear }

// Scénario
{ year, nodes: [geoNode(name, code, lon, lat)], links: [[sourceCode, targetCode, type, intensity, startYear, endYear]] }
```

## Contraintes
- Application 100% statique (pas de serveur, pas de build)
- Tout dans index.html (pas de séparation CSS/JS)
- Pas de localStorage (environnement sandboxé)
- État partageable via URL hash uniquement
- Compatibilité navigateurs modernes (Chrome, Firefox, Safari)
- Interface en français
- Accents intentionnellement absents dans les constantes JS (compatibilité)

## Variables globales principales
- `RELATION_TYPES` : définitions des types de liens (couleur, dash, poids)
- `COUNTRY_INFO` : base de données pays (régime, population, PIB, région, coordonnées)
- `COUNTRY_TOPO_IDS` : mapping code ISO → ID TopoJSON
- `scenarios` : tous les scénarios préconfigurés
- `scenarioGroups` : groupes d'affichage dans la sidebar
- `state` : état courant de l'application

## Fonctions clés
- `hydrateScenario(key)` : charge un scénario
- `render()` : re-rendu complet du graphe SVG
- `importState(payload)` / `exportState()` : sérialisation
- `encodeStateToHash()` / `decodeStateFromHash(hash)` : URL sharing
- `sanitizeNode()` / `sanitizeLink()` : validation des données
