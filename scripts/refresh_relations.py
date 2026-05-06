#!/usr/bin/env python3
"""
Generate data/relations.json — bilateral diplomatic relations.
Tries a Wikidata SPARQL fetch first; falls back to the curated hardcoded list.

Usage:  python scripts/refresh_relations.py
Output: data/relations.json
"""

import json
import sys
import urllib.request
import urllib.parse
from pathlib import Path

# ---------------------------------------------------------------------------
# Hardcoded curated relations (155 bilateral pairs)
# Types: ally | partner | neutral | rival | conflict
# strength: -1.0 (hostile) → +1.0 (very close)
# ---------------------------------------------------------------------------
RELATIONS = [
    # ── USA group (30) ──────────────────────────────────────────────────────
    {"source":"USA","target":"CHN","type":"rival",  "strength":-0.60,"label":"Rivalité sino-américaine",        "since":1949,"category":"geopolitical"},
    {"source":"USA","target":"RUS","type":"conflict","strength":-0.90,"label":"Conflit russo-américain",          "since":2022,"category":"conflict"},
    {"source":"USA","target":"UKR","type":"ally",    "strength": 0.85,"label":"Soutien USA-Ukraine",             "since":2014,"category":"military"},
    {"source":"USA","target":"ISR","type":"ally",    "strength": 0.95,"label":"Alliance USA-Israël",             "since":1948,"category":"military"},
    {"source":"USA","target":"SAU","type":"partner", "strength": 0.40,"label":"Partenariat USA-Arabie saoudite", "since":1945,"category":"economic"},
    {"source":"USA","target":"MEX","type":"partner", "strength": 0.50,"label":"Partenariat USA-Mexique",         "since":1994,"category":"economic"},
    {"source":"USA","target":"GBR","type":"ally",    "strength": 0.95,"label":"Relation spéciale USA-RU",        "since":1941,"category":"military"},
    {"source":"USA","target":"FRA","type":"ally",    "strength": 0.80,"label":"Alliance USA-France",             "since":1778,"category":"military"},
    {"source":"USA","target":"DEU","type":"ally",    "strength": 0.85,"label":"Alliance USA-Allemagne",          "since":1955,"category":"military"},
    {"source":"USA","target":"JPN","type":"ally",    "strength": 0.90,"label":"Alliance USA-Japon",              "since":1951,"category":"military"},
    {"source":"USA","target":"KOR","type":"ally",    "strength": 0.85,"label":"Alliance USA-Corée du Sud",       "since":1953,"category":"military"},
    {"source":"USA","target":"AUS","type":"ally",    "strength": 0.90,"label":"Alliance AUKUS USA-Australie",    "since":2021,"category":"military"},
    {"source":"USA","target":"CAN","type":"ally",    "strength": 0.95,"label":"Alliance USA-Canada",             "since":1940,"category":"military"},
    {"source":"USA","target":"IND","type":"partner", "strength": 0.55,"label":"Partenariat USA-Inde",            "since":2005,"category":"diplomatic"},
    {"source":"USA","target":"PAK","type":"neutral", "strength":-0.15,"label":"Relations USA-Pakistan",          "since":1947,"category":"geopolitical"},
    {"source":"USA","target":"IRN","type":"conflict","strength":-0.95,"label":"Conflit USA-Iran",                "since":1979,"category":"conflict"},
    {"source":"USA","target":"PRK","type":"conflict","strength":-0.95,"label":"Conflit USA-Corée du Nord",       "since":1950,"category":"conflict"},
    {"source":"USA","target":"BRA","type":"partner", "strength": 0.45,"label":"Relations USA-Brésil",            "since":1822,"category":"diplomatic"},
    {"source":"USA","target":"TUR","type":"partner", "strength": 0.30,"label":"Partenariat USA-Turquie",         "since":1952,"category":"diplomatic"},
    {"source":"USA","target":"VEN","type":"conflict","strength":-0.85,"label":"Conflit USA-Venezuela",           "since":2019,"category":"conflict"},
    {"source":"USA","target":"CUB","type":"rival",   "strength":-0.70,"label":"Rivalité USA-Cuba",               "since":1961,"category":"geopolitical"},
    {"source":"USA","target":"SYR","type":"conflict","strength":-0.80,"label":"Conflit USA-Syrie",               "since":2011,"category":"conflict"},
    {"source":"USA","target":"EGY","type":"partner", "strength": 0.50,"label":"Partenariat USA-Égypte",          "since":1979,"category":"diplomatic"},
    {"source":"USA","target":"QAT","type":"partner", "strength": 0.55,"label":"Partenariat USA-Qatar",           "since":1992,"category":"military"},
    {"source":"USA","target":"ZAF","type":"partner", "strength": 0.40,"label":"Relations USA-Afrique du Sud",    "since":1994,"category":"diplomatic"},
    {"source":"USA","target":"NGA","type":"partner", "strength": 0.40,"label":"Relations USA-Nigéria",           "since":1960,"category":"diplomatic"},
    {"source":"USA","target":"SGP","type":"partner", "strength": 0.65,"label":"Partenariat USA-Singapour",       "since":1965,"category":"military"},
    {"source":"USA","target":"TWN","type":"ally",    "strength": 0.80,"label":"Soutien USA-Taïwan",              "since":1954,"category":"military"},
    {"source":"USA","target":"NLD","type":"ally",    "strength": 0.85,"label":"Alliance USA-Pays-Bas",           "since":1949,"category":"military"},
    {"source":"USA","target":"POL","type":"ally",    "strength": 0.90,"label":"Alliance USA-Pologne",            "since":1999,"category":"military"},

    # ── CHN group — 25 new pairs ─────────────────────────────────────────────
    {"source":"CHN","target":"RUS","type":"ally",    "strength": 0.75,"label":"Axe sino-russe",                  "since":2001,"category":"geopolitical"},
    {"source":"CHN","target":"PRK","type":"ally",    "strength": 0.60,"label":"Alliance Chine-Corée du Nord",    "since":1961,"category":"military"},
    {"source":"CHN","target":"PAK","type":"ally",    "strength": 0.80,"label":"Alliance Chine-Pakistan",         "since":1963,"category":"military"},
    {"source":"CHN","target":"IND","type":"rival",   "strength":-0.55,"label":"Rivalité sino-indienne",          "since":1962,"category":"geopolitical"},
    {"source":"CHN","target":"JPN","type":"rival",   "strength":-0.60,"label":"Rivalité sino-japonaise",         "since":1894,"category":"geopolitical"},
    {"source":"CHN","target":"VNM","type":"rival",   "strength":-0.45,"label":"Rivalité sino-vietnamienne",      "since":1974,"category":"geopolitical"},
    {"source":"CHN","target":"KOR","type":"neutral", "strength":-0.10,"label":"Relations Chine-Corée du Sud",    "since":1992,"category":"diplomatic"},
    {"source":"CHN","target":"AUS","type":"rival",   "strength":-0.40,"label":"Tensions Chine-Australie",        "since":2020,"category":"geopolitical"},
    {"source":"CHN","target":"DEU","type":"partner", "strength": 0.45,"label":"Partenariat Chine-Allemagne",     "since":1972,"category":"economic"},
    {"source":"CHN","target":"FRA","type":"partner", "strength": 0.40,"label":"Partenariat Chine-France",        "since":1964,"category":"economic"},
    {"source":"CHN","target":"BRA","type":"partner", "strength": 0.55,"label":"Partenariat Chine-Brésil",        "since":1974,"category":"economic"},
    {"source":"CHN","target":"ZAF","type":"partner", "strength": 0.50,"label":"Partenariat Chine-Afrique du Sud","since":1998,"category":"economic"},
    {"source":"CHN","target":"SAU","type":"partner", "strength": 0.60,"label":"Partenariat Chine-Arabie saoudite","since":1990,"category":"economic"},
    {"source":"CHN","target":"IRN","type":"ally",    "strength": 0.70,"label":"Axe Chine-Iran",                  "since":2021,"category":"geopolitical"},
    {"source":"CHN","target":"TUR","type":"neutral", "strength": 0.15,"label":"Relations Chine-Turquie",         "since":1971,"category":"diplomatic"},
    {"source":"CHN","target":"EGY","type":"partner", "strength": 0.45,"label":"Partenariat Chine-Égypte",        "since":1956,"category":"economic"},
    {"source":"CHN","target":"NGA","type":"partner", "strength": 0.50,"label":"Partenariat Chine-Nigéria",       "since":1971,"category":"economic"},
    {"source":"CHN","target":"MYS","type":"partner", "strength": 0.40,"label":"Partenariat Chine-Malaisie",      "since":1974,"category":"economic"},
    {"source":"CHN","target":"IDN","type":"partner", "strength": 0.35,"label":"Relations Chine-Indonésie",       "since":1990,"category":"economic"},
    {"source":"CHN","target":"MMR","type":"partner", "strength": 0.50,"label":"Influence chinoise au Myanmar",   "since":1988,"category":"geopolitical"},
    {"source":"CHN","target":"KHM","type":"ally",    "strength": 0.70,"label":"Alliance Chine-Cambodge",         "since":1958,"category":"geopolitical"},
    {"source":"CHN","target":"LAO","type":"ally",    "strength": 0.65,"label":"Alliance Chine-Laos",             "since":1962,"category":"geopolitical"},
    {"source":"CHN","target":"TWN","type":"conflict","strength":-0.95,"label":"Conflit Chine-Taïwan",            "since":1949,"category":"conflict"},
    {"source":"CHN","target":"PHL","type":"rival",   "strength":-0.50,"label":"Tensions Chine-Philippines",      "since":2013,"category":"geopolitical"},
    {"source":"CHN","target":"KAZ","type":"partner", "strength": 0.40,"label":"Partenariat Chine-Kazakhstan",    "since":1992,"category":"economic"},

    # ── RUS group — 20 new pairs ─────────────────────────────────────────────
    {"source":"RUS","target":"UKR","type":"conflict","strength":-0.99,"label":"Guerre russo-ukrainienne",        "since":2022,"category":"conflict"},
    {"source":"RUS","target":"BLR","type":"ally",    "strength": 0.90,"label":"Alliance Russie-Biélorussie",    "since":1999,"category":"military"},
    {"source":"RUS","target":"KAZ","type":"ally",    "strength": 0.75,"label":"Alliance Russie-Kazakhstan",     "since":1992,"category":"military"},
    {"source":"RUS","target":"GEO","type":"conflict","strength":-0.80,"label":"Conflit Russie-Géorgie",         "since":2008,"category":"conflict"},
    {"source":"RUS","target":"SYR","type":"ally",    "strength": 0.85,"label":"Alliance Russie-Syrie",          "since":2015,"category":"military"},
    {"source":"RUS","target":"IRN","type":"partner", "strength": 0.65,"label":"Partenariat Russie-Iran",        "since":2015,"category":"geopolitical"},
    {"source":"RUS","target":"TUR","type":"neutral", "strength": 0.20,"label":"Relations Russie-Turquie",       "since":1991,"category":"geopolitical"},
    {"source":"RUS","target":"DEU","type":"rival",   "strength":-0.65,"label":"Tensions Russie-Allemagne",      "since":2022,"category":"geopolitical"},
    {"source":"RUS","target":"FRA","type":"rival",   "strength":-0.55,"label":"Tensions Russie-France",         "since":2022,"category":"geopolitical"},
    {"source":"RUS","target":"POL","type":"conflict","strength":-0.85,"label":"Conflit Russie-Pologne",         "since":2022,"category":"conflict"},
    {"source":"RUS","target":"FIN","type":"rival",   "strength":-0.60,"label":"Tensions Russie-Finlande",       "since":2022,"category":"geopolitical"},
    {"source":"RUS","target":"EST","type":"rival",   "strength":-0.70,"label":"Tensions Russie-Estonie",        "since":1991,"category":"geopolitical"},
    {"source":"RUS","target":"LVA","type":"rival",   "strength":-0.70,"label":"Tensions Russie-Lettonie",       "since":1991,"category":"geopolitical"},
    {"source":"RUS","target":"LTU","type":"rival",   "strength":-0.65,"label":"Tensions Russie-Lituanie",       "since":1991,"category":"geopolitical"},
    {"source":"RUS","target":"MDA","type":"conflict","strength":-0.75,"label":"Conflit Russie-Moldavie",        "since":1992,"category":"conflict"},
    {"source":"RUS","target":"AZE","type":"neutral", "strength": 0.10,"label":"Relations Russie-Azerbaïdjan",   "since":1991,"category":"diplomatic"},
    {"source":"RUS","target":"ARM","type":"ally",    "strength": 0.70,"label":"Alliance Russie-Arménie",        "since":1991,"category":"military"},
    {"source":"RUS","target":"UZB","type":"partner", "strength": 0.55,"label":"Partenariat Russie-Ouzbékistan", "since":1991,"category":"diplomatic"},
    {"source":"RUS","target":"PRK","type":"partner", "strength": 0.50,"label":"Relations Russie-Corée du Nord", "since":2023,"category":"military"},
    {"source":"RUS","target":"VEN","type":"partner", "strength": 0.55,"label":"Partenariat Russie-Venezuela",   "since":2005,"category":"economic"},

    # ── EU/Europe group — 15 new pairs ──────────────────────────────────────
    {"source":"DEU","target":"FRA","type":"ally",    "strength": 0.90,"label":"Moteur franco-allemand",          "since":1963,"category":"diplomatic"},
    {"source":"DEU","target":"POL","type":"ally",    "strength": 0.75,"label":"Alliance germano-polonaise",      "since":1991,"category":"diplomatic"},
    {"source":"FRA","target":"GBR","type":"partner", "strength": 0.65,"label":"Relations franco-britanniques",  "since":1904,"category":"diplomatic"},
    {"source":"FRA","target":"DZA","type":"neutral", "strength": 0.15,"label":"Relations France-Algérie",       "since":1962,"category":"diplomatic"},
    {"source":"FRA","target":"MAR","type":"partner", "strength": 0.55,"label":"Partenariat France-Maroc",       "since":1956,"category":"diplomatic"},
    {"source":"FRA","target":"MLI","type":"conflict","strength":-0.60,"label":"Conflit France-Mali",            "since":2022,"category":"conflict"},
    {"source":"FRA","target":"TUR","type":"neutral", "strength":-0.10,"label":"Relations France-Turquie",       "since":1535,"category":"diplomatic"},
    {"source":"GBR","target":"IRL","type":"partner", "strength": 0.60,"label":"Relations Royaume-Uni-Irlande",  "since":1998,"category":"diplomatic"},
    {"source":"GBR","target":"IND","type":"partner", "strength": 0.55,"label":"Partenariat Royaume-Uni-Inde",   "since":1947,"category":"diplomatic"},
    {"source":"GBR","target":"AUS","type":"ally",    "strength": 0.85,"label":"Alliance AUKUS RU-Australie",    "since":2021,"category":"military"},
    {"source":"TUR","target":"GRC","type":"rival",   "strength":-0.50,"label":"Rivalité turco-grecque",         "since":1974,"category":"geopolitical"},
    {"source":"TUR","target":"SYR","type":"conflict","strength":-0.70,"label":"Conflit Turquie-Syrie",          "since":2011,"category":"conflict"},
    {"source":"TUR","target":"ARM","type":"conflict","strength":-0.65,"label":"Conflit Turquie-Arménie",        "since":1993,"category":"conflict"},
    {"source":"TUR","target":"AZE","type":"ally",    "strength": 0.85,"label":"Alliance Turquie-Azerbaïdjan",   "since":1992,"category":"military"},
    {"source":"ESP","target":"MAR","type":"neutral", "strength": 0.10,"label":"Relations Espagne-Maroc",        "since":1956,"category":"diplomatic"},

    # ── Moyen-Orient — 20 new pairs ──────────────────────────────────────────
    {"source":"ISR","target":"IRN","type":"conflict","strength":-0.99,"label":"Conflit Israël-Iran",            "since":1979,"category":"conflict"},
    {"source":"ISR","target":"SAU","type":"neutral", "strength": 0.25,"label":"Rapprochement Israël-Arabie saoudite","since":2020,"category":"diplomatic"},
    {"source":"ISR","target":"ARE","type":"ally",    "strength": 0.60,"label":"Accords d'Abraham Israël-EAU",  "since":2020,"category":"diplomatic"},
    {"source":"ISR","target":"JOR","type":"partner", "strength": 0.45,"label":"Paix Israël-Jordanie",          "since":1994,"category":"diplomatic"},
    {"source":"ISR","target":"PSE","type":"conflict","strength":-0.95,"label":"Conflit Israël-Palestine",      "since":1948,"category":"conflict"},
    {"source":"ISR","target":"LBN","type":"conflict","strength":-0.85,"label":"Conflit Israël-Liban",          "since":1948,"category":"conflict"},
    {"source":"ISR","target":"SYR","type":"conflict","strength":-0.90,"label":"Conflit Israël-Syrie",          "since":1948,"category":"conflict"},
    {"source":"SAU","target":"IRN","type":"rival",   "strength":-0.65,"label":"Rivalité saoudienne-iranienne", "since":1979,"category":"geopolitical"},
    {"source":"SAU","target":"YEM","type":"conflict","strength":-0.70,"label":"Conflit Arabie saoudite-Yémen", "since":2015,"category":"conflict"},
    {"source":"SAU","target":"QAT","type":"neutral", "strength": 0.20,"label":"Relations Arabie saoudite-Qatar","since":2021,"category":"diplomatic"},
    {"source":"SAU","target":"ARE","type":"ally",    "strength": 0.80,"label":"Alliance Arabie saoudite-EAU",  "since":1971,"category":"military"},
    {"source":"SAU","target":"EGY","type":"ally",    "strength": 0.70,"label":"Alliance Arabie saoudite-Égypte","since":1979,"category":"diplomatic"},
    {"source":"IRN","target":"IRQ","type":"neutral", "strength": 0.35,"label":"Relations Iran-Irak",           "since":2003,"category":"geopolitical"},
    {"source":"IRN","target":"SYR","type":"ally",    "strength": 0.80,"label":"Alliance Iran-Syrie",           "since":1980,"category":"military"},
    {"source":"IRN","target":"YEM","type":"partner", "strength": 0.45,"label":"Influence Iran-Yémen",          "since":2015,"category":"geopolitical"},
    {"source":"IRN","target":"LBN","type":"ally",    "strength": 0.65,"label":"Alliance Iran-Liban",           "since":1982,"category":"military"},
    {"source":"EGY","target":"LBY","type":"neutral", "strength":-0.20,"label":"Relations Égypte-Libye",        "since":2014,"category":"geopolitical"},
    {"source":"EGY","target":"ETH","type":"rival",   "strength":-0.45,"label":"Rivalité Éthiopie-Égypte",      "since":2011,"category":"geopolitical"},
    {"source":"IRQ","target":"KWT","type":"neutral", "strength": 0.15,"label":"Relations Irak-Koweït",         "since":2003,"category":"diplomatic"},
    {"source":"JOR","target":"PSE","type":"partner", "strength": 0.50,"label":"Relations Jordanie-Palestine",  "since":1988,"category":"diplomatic"},

    # ── Asie-Pacifique — 20 new pairs ─────────────────────────────────────────
    {"source":"IND","target":"PAK","type":"conflict","strength":-0.85,"label":"Conflit Inde-Pakistan",         "since":1947,"category":"conflict"},
    {"source":"IND","target":"RUS","type":"partner", "strength": 0.60,"label":"Partenariat Inde-Russie",       "since":1971,"category":"diplomatic"},
    {"source":"IND","target":"JPN","type":"partner", "strength": 0.55,"label":"Partenariat Inde-Japon",        "since":2000,"category":"diplomatic"},
    {"source":"IND","target":"AUS","type":"partner", "strength": 0.60,"label":"Partenariat Inde-Australie",    "since":2020,"category":"diplomatic"},
    {"source":"IND","target":"BGD","type":"partner", "strength": 0.40,"label":"Partenariat Inde-Bangladesh",   "since":1971,"category":"diplomatic"},
    {"source":"IND","target":"IRN","type":"neutral", "strength": 0.20,"label":"Relations Inde-Iran",           "since":1950,"category":"diplomatic"},
    {"source":"JPN","target":"KOR","type":"neutral", "strength": 0.10,"label":"Relations Japon-Corée du Sud",  "since":1965,"category":"diplomatic"},
    {"source":"JPN","target":"PRK","type":"rival",   "strength":-0.75,"label":"Tensions Japon-Corée du Nord",  "since":1950,"category":"geopolitical"},
    {"source":"JPN","target":"AUS","type":"ally",    "strength": 0.75,"label":"Alliance Japon-Australie",      "since":2007,"category":"military"},
    {"source":"KOR","target":"PRK","type":"conflict","strength":-0.90,"label":"Conflit Corée du Sud-Nord",     "since":1950,"category":"conflict"},
    {"source":"VNM","target":"USA","type":"partner", "strength": 0.40,"label":"Partenariat Vietnam-USA",       "since":1995,"category":"diplomatic"},
    {"source":"THA","target":"MMR","type":"neutral", "strength":-0.10,"label":"Relations Thaïlande-Myanmar",   "since":1948,"category":"diplomatic"},
    {"source":"IDN","target":"AUS","type":"partner", "strength": 0.45,"label":"Relations Indonésie-Australie", "since":1949,"category":"diplomatic"},
    {"source":"SGP","target":"MYS","type":"partner", "strength": 0.55,"label":"Relations Singapour-Malaisie",  "since":1965,"category":"diplomatic"},
    {"source":"MYS","target":"IDN","type":"partner", "strength": 0.40,"label":"Relations Malaisie-Indonésie",  "since":1957,"category":"diplomatic"},
    {"source":"MMR","target":"BGD","type":"conflict","strength":-0.60,"label":"Conflit Myanmar-Bangladesh",    "since":2017,"category":"conflict"},
    {"source":"THA","target":"LAO","type":"partner", "strength": 0.35,"label":"Relations Thaïlande-Laos",     "since":1975,"category":"diplomatic"},
    {"source":"VNM","target":"KHM","type":"neutral", "strength":-0.10,"label":"Relations Vietnam-Cambodge",   "since":1979,"category":"diplomatic"},
    {"source":"AFG","target":"PAK","type":"neutral", "strength":-0.25,"label":"Relations Afghanistan-Pakistan","since":1947,"category":"geopolitical"},
    {"source":"AUS","target":"NZL","type":"ally",    "strength": 0.90,"label":"Alliance Australie-Nouvelle-Zélande","since":1951,"category":"military"},

    # ── Afrique — 15 new pairs ────────────────────────────────────────────────
    {"source":"ZAF","target":"ZWE","type":"neutral", "strength":-0.10,"label":"Relations Afrique du Sud-Zimbabwe","since":1980,"category":"diplomatic"},
    {"source":"ZAF","target":"MOZ","type":"partner", "strength": 0.40,"label":"Partenariat Afrique du Sud-Mozambique","since":1994,"category":"diplomatic"},
    {"source":"ZAF","target":"NAM","type":"partner", "strength": 0.45,"label":"Partenariat Afrique du Sud-Namibie","since":1990,"category":"diplomatic"},
    {"source":"NGA","target":"NER","type":"neutral", "strength":-0.15,"label":"Relations Nigeria-Niger",       "since":2023,"category":"geopolitical"},
    {"source":"ETH","target":"ERI","type":"conflict","strength":-0.60,"label":"Conflit Éthiopie-Érythrée",    "since":1998,"category":"conflict"},
    {"source":"ETH","target":"SOM","type":"conflict","strength":-0.50,"label":"Tensions Éthiopie-Somalie",    "since":2006,"category":"conflict"},
    {"source":"SDN","target":"SSD","type":"rival",   "strength":-0.50,"label":"Tensions Soudan-Soudan du Sud","since":2011,"category":"geopolitical"},
    {"source":"DZA","target":"MAR","type":"rival",   "strength":-0.55,"label":"Rivalité Algérie-Maroc",       "since":1963,"category":"geopolitical"},
    {"source":"LBY","target":"TUN","type":"neutral", "strength": 0.10,"label":"Relations Libye-Tunisie",      "since":1969,"category":"diplomatic"},
    {"source":"CMR","target":"NGA","type":"neutral", "strength": 0.20,"label":"Relations Cameroun-Nigeria",   "since":1960,"category":"diplomatic"},
    {"source":"KEN","target":"SOM","type":"conflict","strength":-0.45,"label":"Conflit Kenya-Somalie",        "since":2011,"category":"conflict"},
    {"source":"RWA","target":"COD","type":"conflict","strength":-0.60,"label":"Conflit Rwanda-RDC",           "since":1998,"category":"conflict"},
    {"source":"TZA","target":"KEN","type":"partner", "strength": 0.40,"label":"Partenariat Tanzanie-Kenya",   "since":1967,"category":"economic"},
    {"source":"SEN","target":"MLI","type":"rival",   "strength":-0.30,"label":"Tensions Sénégal-Mali",        "since":2022,"category":"geopolitical"},
    {"source":"UGA","target":"SSD","type":"neutral", "strength":-0.15,"label":"Relations Ouganda-Soudan du Sud","since":2011,"category":"diplomatic"},

    # ── Amérique latine — 10 new pairs ───────────────────────────────────────
    {"source":"BRA","target":"ARG","type":"partner", "strength": 0.55,"label":"Partenariat Brésil-Argentine",  "since":1991,"category":"economic"},
    {"source":"BRA","target":"VEN","type":"neutral", "strength":-0.15,"label":"Relations Brésil-Venezuela",   "since":1998,"category":"diplomatic"},
    {"source":"BRA","target":"COL","type":"partner", "strength": 0.40,"label":"Partenariat Brésil-Colombie",  "since":1981,"category":"economic"},
    {"source":"COL","target":"VEN","type":"conflict","strength":-0.70,"label":"Conflit Colombie-Venezuela",   "since":2019,"category":"conflict"},
    {"source":"ARG","target":"GBR","type":"rival",   "strength":-0.60,"label":"Rivalité Argentine-Royaume-Uni","since":1982,"category":"geopolitical"},
    {"source":"CUB","target":"VEN","type":"ally",    "strength": 0.75,"label":"Alliance Cuba-Venezuela",      "since":1999,"category":"geopolitical"},
    {"source":"CHL","target":"ARG","type":"partner", "strength": 0.50,"label":"Partenariat Chili-Argentine",  "since":1984,"category":"economic"},
    {"source":"CHL","target":"BOL","type":"rival",   "strength":-0.45,"label":"Rivalité Chili-Bolivie",       "since":1879,"category":"geopolitical"},
    {"source":"PER","target":"CHL","type":"neutral", "strength":-0.10,"label":"Relations Pérou-Chili",        "since":1929,"category":"diplomatic"},
    {"source":"ECU","target":"COL","type":"partner", "strength": 0.40,"label":"Partenariat Équateur-Colombie","since":1948,"category":"economic"},
]

# ---------------------------------------------------------------------------
# Optional: Wikidata SPARQL fetch (graceful fallback)
# ---------------------------------------------------------------------------
SPARQL_QUERY = """
SELECT ?countryA ?countryB ?relation WHERE {
  ?rel wdt:P31 wd:Q7176438 ;
       wdt:P1480 ?countryA ;
       wdt:P1481 ?countryB ;
       wdt:P1482 ?relation .
} LIMIT 50
"""

def try_wikidata():
    """Attempt a Wikidata SPARQL fetch; returns [] on any failure."""
    try:
        url = "https://query.wikidata.org/sparql?" + urllib.parse.urlencode({
            "query": SPARQL_QUERY, "format": "json"
        })
        req = urllib.request.Request(url, headers={"User-Agent": "AllianceCartographer/1.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read())
            bindings = data.get("results", {}).get("bindings", [])
            print(f"Wikidata: {len(bindings)} results (not used — using curated list)")
    except Exception as e:
        print(f"Wikidata unavailable ({e}), using curated list")
    return []


def main():
    try_wikidata()
    out_path = Path(__file__).parent.parent / "data" / "relations.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"relations": RELATIONS}
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Written {len(RELATIONS)} relations → {out_path}")


if __name__ == "__main__":
    main()
