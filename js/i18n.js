// i18n.js — Internationalization module
export const TRANSLATIONS = {
  fr: {
    // App title & meta
    appTitle: "Alliance Cartographer",
    appSubtitle: "Vue d'ensemble géopolitique.",
    appDescription: "Explorez les alliances, rivalités et bascules géopolitiques mondiales de 1945 à nos jours.",
    enterBtn: "Commencer l'exploration →",

    // Sidebar sections
    scenarioTitle: "Scénario / Thématique",
    allScenarios: "Tous (vue globale)",
    searchTitle: "Recherche globale",
    searchPlaceholder: "Taper un pays pour zoomer...",
    timelineTitle: "Chronologie",
    yearLabel: "Année observée",
    filtersTitle: "Filtres",
    legendTitle: "Légende",
    influenceTitle: "Influence",
    focusTitle: "Focus direct",
    focusEmpty: "Cliquez sur un pays pour isoler ses relations.",
    editorTitle: "Éditeur (Mode Admin)",
    undoBtn: "Annuler (Ctrl+Z)",
    sourceLabel: "Source",
    targetLabel: "Cible",
    typeLabel: "Type",
    intensityLabel: "Intensité (1-5)",
    startLabel: "Début",
    endLabel: "Fin",
    validateBtn: "Valider",

    // Toolbar / Settings
    settingsTitle: "Paramètres",
    languageLabel: "Langue",
    themeLabel: "Thème",
    themeLight: "Clair",
    themeDark: "Sombre",
    daltonLabel: "Mode daltonien",
    copyLink: "Copier le lien",
    exportJson: "Exporter JSON",
    exportPng: "Exporter PNG",
    exportSvg: "Exporter SVG",
    viewModeMap: "Carte",
    viewModeNetwork: "Réseau",

    // Info panel
    codeLabel: "Code",
    regionLabel: "Région",
    regimeLabel: "Régime",
    populationLabel: "Population",
    gdpLabel: "PIB nominal",
    powerLabel: "Indicateur de puissance",
    unrecognizedBadge: "État non reconnu",
    noCode: "Code non standard",
    noData: "N/A",

    // Relation types
    alliance: "Alliance",
    conflict: "Conflit",
    rivalry: "Rivalité",
    partnership: "Partenariat",
    neutrality: "Neutralité",
    tension: "Tension",
    dependence: "Dépendance",

    // Misc
    allRelations: "Toutes les relations visibles",
    linksCopied: "✓ Copié !",
    errorLoad: "Erreur de chargement des données. Vérifiez world.json.",
    closePanel: "Fermer",

    // Shortcuts modal
    shortcutsTitle: "Raccourcis clavier",
    shortcutsClose: "Fermer",
    shortcutT: "Basculer thème clair / sombre",
    shortcutEsc: "Désélectionner le pays actif",
    shortcutCtrlZ: "Annuler (mode édition)",
    shortcutCtrlY: "Rétablir (mode édition)",
    shortcutQuestion: "Afficher / masquer cette aide",
  },
  en: {
    appTitle: "Alliance Cartographer",
    appSubtitle: "Geopolitical overview.",
    appDescription: "Explore alliances, rivalries and geopolitical shifts from 1945 to today.",
    enterBtn: "Start Exploring →",

    scenarioTitle: "Scenario / Theme",
    allScenarios: "All (global view)",
    searchTitle: "Global Search",
    searchPlaceholder: "Type a country to zoom...",
    timelineTitle: "Timeline",
    yearLabel: "Year observed",
    filtersTitle: "Filters",
    legendTitle: "Legend",
    influenceTitle: "Influence",
    focusTitle: "Direct Focus",
    focusEmpty: "Click on a country to isolate its relations.",
    editorTitle: "Editor (Admin Mode)",
    undoBtn: "Undo (Ctrl+Z)",
    sourceLabel: "Source",
    targetLabel: "Target",
    typeLabel: "Type",
    intensityLabel: "Intensity (1-5)",
    startLabel: "Start",
    endLabel: "End",
    validateBtn: "Validate",

    settingsTitle: "Settings",
    languageLabel: "Language",
    themeLabel: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    daltonLabel: "Colorblind mode",
    copyLink: "Copy link",
    exportJson: "Export JSON",
    exportPng: "Export PNG",
    exportSvg: "Export SVG",
    viewModeMap: "Map",
    viewModeNetwork: "Network",

    codeLabel: "Code",
    regionLabel: "Region",
    regimeLabel: "Regime",
    populationLabel: "Population",
    gdpLabel: "Nominal GDP",
    powerLabel: "Power index",
    unrecognizedBadge: "Unrecognized State",
    noCode: "Non-standard code",
    noData: "N/A",

    alliance: "Alliance",
    conflict: "Conflict",
    rivalry: "Rivalry",
    partnership: "Partnership",
    neutrality: "Neutrality",
    tension: "Tension",
    dependence: "Dependence",

    allRelations: "All relations visible",
    linksCopied: "✓ Copied!",
    errorLoad: "Failed to load data. Check world.json.",
    closePanel: "Close",

    // Shortcuts modal
    shortcutsTitle: "Keyboard shortcuts",
    shortcutsClose: "Close",
    shortcutT: "Toggle light / dark theme",
    shortcutEsc: "Deselect active country",
    shortcutCtrlZ: "Undo (edit mode)",
    shortcutCtrlY: "Redo (edit mode)",
    shortcutQuestion: "Show / hide this help",
  }
};

let currentLang = localStorage.getItem('ac-lang') || 'fr';

export function getLang() { return currentLang; }

export function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('ac-lang', lang);
}

export function t(key) {
  return TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS['fr'][key] ?? key;
}
