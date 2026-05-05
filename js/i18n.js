import { state } from './store.js';

const S = {
  fr: {
    nations: 'Nations', scenarios: 'Scénarios',
    searchPh: 'Rechercher un pays…',
    settingsTitle: 'Paramètres', colorblind: 'Mode daltonien',
    lightMode: 'Mode clair', language: 'Langue',
    exportPng: 'Exporter PNG', exportSvg: 'Exporter SVG',
    copyLink: 'Copier le lien', copied: 'Copié !',
    allRelations: 'Toutes les relations',
    heatmapLabel: 'Heatmap géopolitique',
    heatmapOff: '— Désactivé', heatmapGdp: 'PIB',
    heatmapPop: 'Population', heatmapConflict: 'Conflits',
    compareMode: 'Mode comparaison',
    compareInstruction: 'Cliquez 2 pays à comparer',
    timelineLabel: 'Chronologie',
    identity: 'Identité', data: 'Données',
    isoCode: 'Code ISO', region: 'Région', regime: 'Régime',
    type: 'Type', population: 'Population', gdp: 'PIB',
    lon: 'Longitude', lat: 'Latitude',
    center: 'Centrer', edit: 'Modifier', del: 'Supprimer',
    relation: 'Relation', actors: 'Acteurs',
    characteristics: 'Caractéristiques', intensity: 'Intensité',
    start: 'Début', end: 'Fin', scenario: 'Scénario',
  },
  en: {
    nations: 'Nations', scenarios: 'Scenarios',
    searchPh: 'Search a country…',
    settingsTitle: 'Settings', colorblind: 'Colorblind mode',
    lightMode: 'Light mode', language: 'Language',
    exportPng: 'Export PNG', exportSvg: 'Export SVG',
    copyLink: 'Copy link', copied: 'Copied!',
    allRelations: 'All relations',
    heatmapLabel: 'Geopolitical heatmap',
    heatmapOff: '— Disabled', heatmapGdp: 'GDP',
    heatmapPop: 'Population', heatmapConflict: 'Conflicts',
    compareMode: 'Comparison mode',
    compareInstruction: 'Click 2 countries to compare',
    timelineLabel: 'Timeline',
    identity: 'Identity', data: 'Data',
    isoCode: 'ISO Code', region: 'Region', regime: 'Regime',
    type: 'Type', population: 'Population', gdp: 'GDP',
    lon: 'Longitude', lat: 'Latitude',
    center: 'Center', edit: 'Edit', del: 'Delete',
    relation: 'Relation', actors: 'Actors',
    characteristics: 'Characteristics', intensity: 'Intensity',
    start: 'Start', end: 'End', scenario: 'Scenario',
  }
};

export function t(key) {
  return S[state.lang]?.[key] ?? S.fr[key] ?? key;
}

export function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
}
