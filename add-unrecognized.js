const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/world.json', 'utf8'));

// Add unrecognized states category
const unrecognizedStates = [
  {
    id: 'PS', label: 'Palestine', type: 'unrecognized',
    region: 'Moyen-Orient', regime: 'Autorite palestinienne (territoire conteste)',
    population: '5.4 M', gdp: '18 Md$', lon: 35.2137, lat: 31.9522
  },
  {
    id: 'XK', iso: 'XK', label: 'Kosovo', type: 'country',
    region: 'Europe', regime: 'Republique parlementaire (reconnaissance partielle)',
    population: '1.8 M', gdp: '10 Md$', lon: 21.1655, lat: 42.6629
  },
  {
    id: 'TW', label: 'Taiwan', type: 'unrecognized',
    region: 'Asie de l\'Est', regime: 'Republique presidentielle (statut conteste)',
    population: '23 M', gdp: '750 Md$', lon: 121.5654, lat: 25.0330
  },
  {
    id: 'XNC', iso: null, label: 'Rep. turque de Chypre du Nord', type: 'country',
    region: 'Mediterranee', regime: 'Etat autoproclamé (reconnu uniquement par la Turquie)',
    population: '0.4 M', gdp: '6 Md$', lon: 33.3642, lat: 35.1856
  },
  {
    id: 'XRJ', iso: null, label: 'Rojava', type: 'unrecognized',
    region: 'Moyen-Orient', regime: 'Administration autonome (non reconnue)',
    population: '4 M', gdp: '~2 Md$', lon: 40.8, lat: 37.1
  },
  {
    id: 'SO-LAND', label: 'Somaliland', type: 'unrecognized',
    region: 'Afrique de l\'Est', regime: 'Republique presidentielle (non reconnue)',
    population: '5.7 M', gdp: '3 Md$', lon: 46.1996, lat: 9.5590
  },
  {
    id: 'AB', label: 'Abkhazie', type: 'unrecognized',
    region: 'Caucase', regime: 'Republique presidentielle (reconnue par la Russie)',
    population: '0.24 M', gdp: '0.5 Md$', lon: 41.0260, lat: 43.0000
  }
];

// Only add if not already present
unrecognizedStates.forEach(state => {
  if (!data.nodes.find(n => n.id === state.id)) {
    data.nodes.push(state);
  }
});

// Fix label field - some nodes have label = id code instead of real name
// This fixes original nodes that had label = code
const labelFixes = {
  'US': 'États-Unis', 'CA': 'Canada', 'GB': 'Royaume-Uni', 'FR': 'France',
  'DE': 'Allemagne', 'IT': 'Italie', 'ES': 'Espagne', 'PL': 'Pologne',
  'UA': 'Ukraine', 'RU': 'Russie', 'TR': 'Turquie', 'IN': 'Inde',
  'CN': 'Chine', 'JP': 'Japon', 'KR': 'Corée du Sud', 'KP': 'Corée du Nord',
  'BR': 'Brésil', 'MX': 'Mexique', 'AR': 'Argentine', 'ZA': 'Afrique du Sud',
  'AU': 'Australie', 'EG': 'Égypte', 'NG': 'Nigeria', 'ET': 'Éthiopie',
  'IL': 'Israël', 'SA': 'Arabie saoudite', 'IR': 'Iran', 'IQ': 'Irak',
  'SY': 'Syrie', 'LB': 'Liban', 'YE': 'Yémen', 'PK': 'Pakistan',
  'AF': 'Afghanistan', 'ID': 'Indonésie', 'TH': 'Thaïlande', 'VN': 'Viêt Nam',
  'MY': 'Malaisie', 'PH': 'Philippines', 'MM': 'Myanmar', 'KH': 'Cambodge',
  'SE': 'Suède', 'NO': 'Norvège', 'FI': 'Finlande', 'DK': 'Danemark',
  'NL': 'Pays-Bas', 'BE': 'Belgique', 'CH': 'Suisse', 'AT': 'Autriche',
  'PT': 'Portugal', 'GR': 'Grèce', 'RO': 'Roumanie', 'HU': 'Hongrie',
  'CZ': 'Tchéquie', 'SK': 'Slovaquie', 'RS': 'Serbie', 'HR': 'Croatie',
  'BA': 'Bosnie-Herzégovine', 'MK': 'Macédoine du Nord', 'AL': 'Albanie',
  'ME': 'Monténégro', 'BG': 'Bulgarie', 'MD': 'Moldavie', 'BY': 'Biélorussie',
  'LT': 'Lituanie', 'LV': 'Lettonie', 'EE': 'Estonie', 'GE': 'Géorgie',
  'AM': 'Arménie', 'AZ': 'Azerbaïdjan', 'KZ': 'Kazakhstan', 'UZ': 'Ouzbékistan',
  'TM': 'Turkménistan', 'KG': 'Kirghizstan', 'TJ': 'Tadjikistan',
  'MN': 'Mongolie', 'NP': 'Népal', 'BD': 'Bangladesh', 'LK': 'Sri Lanka',
  'QA': 'Qatar', 'AE': 'Émirats arabes unis', 'KW': 'Koweït', 'OM': 'Oman',
  'JO': 'Jordanie', 'MA': 'Maroc', 'DZ': 'Algérie', 'TN': 'Tunisie',
  'LY': 'Libye', 'SD': 'Soudan', 'SS': 'Soudan du Sud', 'CD': 'RD Congo',
  'CM': 'Cameroun', 'GH': 'Ghana', 'SN': 'Sénégal', 'ML': 'Mali',
  'NE': 'Niger', 'BF': 'Burkina Faso', 'CI': 'Côte d\'Ivoire', 'MZ': 'Mozambique',
  'TZ': 'Tanzanie', 'KE': 'Kenya', 'UG': 'Ouganda', 'RW': 'Rwanda',
  'AO': 'Angola', 'ZM': 'Zambie', 'ZW': 'Zimbabwe', 'MG': 'Madagascar',
  'CU': 'Cuba', 'VE': 'Venezuela', 'CO': 'Colombie', 'PE': 'Pérou',
  'CL': 'Chili', 'BO': 'Bolivie', 'PY': 'Paraguay', 'UY': 'Uruguay',
  'NZ': 'Nouvelle-Zélande', 'PG': 'Papouasie-Nouvelle-Guinée',
  'CY': 'Chypre', 'NATO': 'OTAN', 'EU': 'Union Européenne', 'UN': 'ONU',
  'ASEAN': 'ASEAN', 'AU-ORG': 'Union Africaine',
  'ECOWAS': 'CEDEAO', 'SCO': 'OCS', 'GCC': 'CCG', 'LAS': 'Ligue arabe'
};

data.nodes.forEach(node => {
  if (labelFixes[node.id]) {
    node.name = labelFixes[node.id];
    node.label = labelFixes[node.id];
  } else if (!node.name && node.label && node.label === node.id) {
    node.name = node.label; // keep as is if no fix available
  }
  if (!node.name) node.name = node.label;
});

fs.writeFileSync('data/world.json', JSON.stringify(data, null, 2));
console.log('Updated world.json. Total nodes:', data.nodes.length);
console.log('Unrecognized states:', data.nodes.filter(n => n.type === 'unrecognized').map(n => n.label));
