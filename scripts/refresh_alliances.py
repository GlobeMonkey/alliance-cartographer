#!/usr/bin/env python3
"""
Generate data/alliances.json — geopolitical alliance data for Alliance Cartographer.

Usage:
    python scripts/refresh_alliances.py

Requires: Python 3.8+  (no third-party deps, uses stdlib urllib)

Output: data/alliances.json with:
  - alliances[]   — id, label, color, strength, members (ISO alpha-3)
  - links[]       — all pairwise member links per alliance
  - capitals{}    — lat/lng of each member country's capital
"""

import json
import itertools
import urllib.request
import urllib.error
import sys
import os

# ── Alliance definitions ─────────────────────────────────────────────────────

ALLIANCES = [
    {
        "id": "NATO",
        "label": "OTAN",
        "label_en": "NATO",
        "color": "#4a90d9",
        "strength": 1.0,
        "members": [
            "USA","GBR","FRA","DEU","ITA","ESP","PRT","BEL","NLD","LUX",
            "DNK","NOR","ISL","CAN","GRC","TUR","HUN","CZE","POL","SVK",
            "SVN","EST","LVA","LTU","ROU","BGR","HRV","ALB","MNE","MKD",
            "FIN","SWE",
        ],
    },
    {
        "id": "EU",
        "label": "Union Européenne",
        "label_en": "European Union",
        "color": "#003fa3",
        "strength": 0.7,
        "members": [
            "AUT","BEL","BGR","HRV","CYP","CZE","DNK","EST","FIN","FRA",
            "DEU","GRC","HUN","IRL","ITA","LVA","LTU","LUX","MLT","NLD",
            "POL","PRT","ROU","SVK","SVN","ESP","SWE",
        ],
    },
    {
        "id": "BRICS",
        "label": "BRICS",
        "label_en": "BRICS",
        "color": "#e63946",
        "strength": 0.5,
        "members": [
            "BRA","RUS","IND","CHN","ZAF","IRN","SAU","ARE","ETH","EGY",
        ],
    },
    {
        "id": "SCO",
        "label": "OCS",
        "label_en": "SCO",
        "color": "#e9c46a",
        "strength": 0.5,
        "members": [
            "CHN","RUS","KAZ","KGZ","TJK","UZB","PAK","IND","BLR","IRN",
        ],
    },
    {
        "id": "ASEAN",
        "label": "ASEAN",
        "label_en": "ASEAN",
        "color": "#06d6a0",
        "strength": 0.7,
        "members": [
            "BRN","KHM","IDN","LAO","MYS","MMR","PHL","SGP","THA","VNM",
        ],
    },
    {
        "id": "AU",
        "label": "Union Africaine",
        "label_en": "African Union",
        "color": "#f4a261",
        "strength": 0.5,
        "members": [
            "DZA","AGO","BEN","BWA","BFA","BDI","CMR","CPV","CAF","TCD",
            "COM","COD","CIV","DJI","EGY","GNQ","ERI","ETH","GAB","GMB",
            "GHA","GIN","GNB","KEN","LSO","LBR","LBY","MDG","MWI","MLI",
            "MRT","MUS","MAR","MOZ","NAM","NER","NGA","COG","RWA","STP",
            "SEN","SYC","SLE","SOM","ZAF","SSD","SDN","SWZ","TZA","TGO",
            "TUN","UGA","ZMB","ZWE",
        ],
    },
    {
        "id": "AL",
        "label": "Ligue Arabe",
        "label_en": "Arab League",
        "color": "#2a9d8f",
        "strength": 0.5,
        "members": [
            "DZA","BHR","COM","DJI","EGY","IRQ","JOR","KWT","LBN","LBY",
            "MRT","MAR","OMN","PSE","QAT","SAU","SOM","SDN","SYR","TUN",
            "ARE","YEM",
        ],
    },
    {
        "id": "ALBA",
        "label": "ALBA",
        "label_en": "ALBA",
        "color": "#8338ec",
        "strength": 0.5,
        "members": [
            "CUB","VEN","BOL","NIC","DMA","ATG","KNA","VCT","SUR",
        ],
    },
    {
        "id": "MERCOSUR",
        "label": "MERCOSUR",
        "label_en": "MERCOSUR",
        "color": "#ff9f1c",
        "strength": 0.7,
        "members": ["ARG","BRA","PRY","URY"],
    },
]

# ── Hardcoded capitals (lat/lng of capital city) ─────────────────────────────

CAPITALS_FALLBACK = {
    "USA":{"lat":38.89,"lng":-77.03},"GBR":{"lat":51.50,"lng":-0.12},
    "FRA":{"lat":48.85,"lng":2.35},"DEU":{"lat":52.52,"lng":13.40},
    "ITA":{"lat":41.90,"lng":12.48},"ESP":{"lat":40.42,"lng":-3.70},
    "PRT":{"lat":38.72,"lng":-9.14},"BEL":{"lat":50.85,"lng":4.35},
    "NLD":{"lat":52.37,"lng":4.90},"LUX":{"lat":49.61,"lng":6.13},
    "DNK":{"lat":55.68,"lng":12.57},"NOR":{"lat":59.91,"lng":10.75},
    "ISL":{"lat":64.13,"lng":-21.82},"CAN":{"lat":45.42,"lng":-75.69},
    "GRC":{"lat":37.98,"lng":23.73},"TUR":{"lat":39.92,"lng":32.85},
    "HUN":{"lat":47.50,"lng":19.04},"CZE":{"lat":50.08,"lng":14.47},
    "POL":{"lat":52.23,"lng":21.01},"SVK":{"lat":48.15,"lng":17.11},
    "SVN":{"lat":46.05,"lng":14.51},"EST":{"lat":59.44,"lng":24.75},
    "LVA":{"lat":56.95,"lng":24.11},"LTU":{"lat":54.69,"lng":25.28},
    "ROU":{"lat":44.43,"lng":26.10},"BGR":{"lat":42.70,"lng":23.32},
    "HRV":{"lat":45.81,"lng":15.98},"ALB":{"lat":41.33,"lng":19.82},
    "MNE":{"lat":42.44,"lng":19.26},"MKD":{"lat":42.00,"lng":21.43},
    "FIN":{"lat":60.17,"lng":24.93},"SWE":{"lat":59.33,"lng":18.07},
    "AUT":{"lat":48.21,"lng":16.37},"CYP":{"lat":35.17,"lng":33.37},
    "IRL":{"lat":53.33,"lng":-6.25},"MLT":{"lat":35.90,"lng":14.51},
    "RUS":{"lat":55.75,"lng":37.62},"CHN":{"lat":39.91,"lng":116.39},
    "IND":{"lat":28.61,"lng":77.21},"BRA":{"lat":-15.78,"lng":-47.93},
    "ZAF":{"lat":-25.74,"lng":28.19},"IRN":{"lat":35.70,"lng":51.42},
    "SAU":{"lat":24.69,"lng":46.72},"ARE":{"lat":24.47,"lng":54.37},
    "ETH":{"lat":9.03,"lng":38.74},"EGY":{"lat":30.06,"lng":31.25},
    "KAZ":{"lat":51.18,"lng":71.45},"KGZ":{"lat":42.87,"lng":74.59},
    "TJK":{"lat":38.56,"lng":68.77},"UZB":{"lat":41.30,"lng":69.24},
    "PAK":{"lat":33.72,"lng":73.04},"BLR":{"lat":53.90,"lng":27.57},
    "BRN":{"lat":4.94,"lng":114.94},"KHM":{"lat":11.56,"lng":104.92},
    "IDN":{"lat":-6.21,"lng":106.85},"LAO":{"lat":17.97,"lng":102.60},
    "MYS":{"lat":3.15,"lng":101.70},"MMR":{"lat":19.76,"lng":96.08},
    "PHL":{"lat":14.60,"lng":120.98},"SGP":{"lat":1.28,"lng":103.85},
    "THA":{"lat":13.75,"lng":100.52},"VNM":{"lat":21.03,"lng":105.83},
    "DZA":{"lat":36.74,"lng":3.06},"AGO":{"lat":-8.84,"lng":13.23},
    "BEN":{"lat":6.37,"lng":2.43},"BWA":{"lat":-24.65,"lng":25.91},
    "BFA":{"lat":12.37,"lng":-1.53},"BDI":{"lat":-3.38,"lng":29.36},
    "CMR":{"lat":3.87,"lng":11.52},"CPV":{"lat":14.93,"lng":-23.51},
    "CAF":{"lat":4.36,"lng":18.56},"TCD":{"lat":12.11,"lng":15.04},
    "COM":{"lat":-11.70,"lng":43.26},"COD":{"lat":-4.33,"lng":15.32},
    "CIV":{"lat":6.82,"lng":-5.28},"DJI":{"lat":11.59,"lng":43.15},
    "GNQ":{"lat":3.75,"lng":8.78},"ERI":{"lat":15.34,"lng":38.93},
    "GAB":{"lat":0.39,"lng":9.45},"GMB":{"lat":13.45,"lng":-16.58},
    "GHA":{"lat":5.56,"lng":-0.20},"GIN":{"lat":9.54,"lng":-13.68},
    "GNB":{"lat":11.86,"lng":-15.60},"KEN":{"lat":-1.29,"lng":36.82},
    "LSO":{"lat":-29.32,"lng":27.48},"LBR":{"lat":6.30,"lng":-10.80},
    "LBY":{"lat":32.90,"lng":13.18},"MDG":{"lat":-18.91,"lng":47.54},
    "MWI":{"lat":-13.97,"lng":33.79},"MLI":{"lat":12.65,"lng":-8.00},
    "MRT":{"lat":18.08,"lng":-15.97},"MUS":{"lat":-20.16,"lng":57.50},
    "MAR":{"lat":34.01,"lng":-6.83},"MOZ":{"lat":-25.97,"lng":32.59},
    "NAM":{"lat":-22.56,"lng":17.08},"NER":{"lat":13.51,"lng":2.12},
    "NGA":{"lat":9.06,"lng":7.50},"COG":{"lat":-4.27,"lng":15.28},
    "RWA":{"lat":-1.94,"lng":30.06},"STP":{"lat":0.34,"lng":6.73},
    "SEN":{"lat":14.69,"lng":-17.44},"SYC":{"lat":-4.62,"lng":55.45},
    "SLE":{"lat":8.49,"lng":-13.23},"SOM":{"lat":2.05,"lng":45.34},
    "SSD":{"lat":4.86,"lng":31.60},"SDN":{"lat":15.56,"lng":32.53},
    "SWZ":{"lat":-26.32,"lng":31.13},"TZA":{"lat":-6.17,"lng":35.74},
    "TGO":{"lat":6.14,"lng":1.22},"TUN":{"lat":36.81,"lng":10.18},
    "UGA":{"lat":0.32,"lng":32.58},"ZMB":{"lat":-15.42,"lng":28.28},
    "ZWE":{"lat":-17.83,"lng":31.05},"BHR":{"lat":26.21,"lng":50.59},
    "IRQ":{"lat":33.34,"lng":44.40},"JOR":{"lat":31.95,"lng":35.93},
    "KWT":{"lat":29.37,"lng":47.98},"LBN":{"lat":33.89,"lng":35.50},
    "OMN":{"lat":23.61,"lng":58.59},"PSE":{"lat":31.90,"lng":35.20},
    "QAT":{"lat":25.29,"lng":51.53},"SYR":{"lat":33.51,"lng":36.29},
    "YEM":{"lat":15.35,"lng":44.21},"BOL":{"lat":-16.50,"lng":-68.15},
    "CUB":{"lat":23.13,"lng":-82.38},"VEN":{"lat":10.49,"lng":-66.88},
    "NIC":{"lat":12.13,"lng":-86.28},"ECU":{"lat":-0.23,"lng":-78.52},
    "SUR":{"lat":5.85,"lng":-55.20},"ATG":{"lat":17.12,"lng":-61.85},
    "DMA":{"lat":15.30,"lng":-61.39},"GRD":{"lat":12.05,"lng":-61.75},
    "KNA":{"lat":17.30,"lng":-62.73},"VCT":{"lat":13.16,"lng":-61.23},
    "ARG":{"lat":-34.61,"lng":-58.38},"PRY":{"lat":-25.28,"lng":-57.65},
    "URY":{"lat":-34.90,"lng":-56.19},
}


def fetch_capitals_from_restcountries():
    """Try to fetch capital lat/lng from restcountries.com/v3.1/all."""
    print("Fetching capitals from restcountries.com …", flush=True)
    try:
        req = urllib.request.Request(
            "https://restcountries.com/v3.1/all?fields=cca3,capitalInfo",
            headers={"User-Agent": "AllianceCartographer/1.0"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        capitals = {}
        for c in data:
            cca3 = c.get("cca3")
            info = c.get("capitalInfo", {})
            latlng = info.get("latlng")
            if cca3 and latlng and len(latlng) == 2:
                capitals[cca3] = {"lat": round(latlng[0], 4), "lng": round(latlng[1], 4)}
        print(f"  → Got {len(capitals)} capitals from API", flush=True)
        return capitals
    except Exception as e:
        print(f"  → API unavailable ({e}), using hardcoded fallback", flush=True)
        return None


def build_links(alliances):
    links = []
    for a in alliances:
        members = a["members"]
        strength = a["strength"]
        for src, tgt in itertools.combinations(members, 2):
            links.append({
                "source": src,
                "target": tgt,
                "alliance": a["id"],
                "strength": strength,
            })
    print(f"Generated {len(links)} pairwise links across {len(alliances)} alliances")
    return links


def collect_capitals(alliances, api_capitals):
    needed = set()
    for a in alliances:
        needed.update(a["members"])
    caps = {}
    for cca3 in sorted(needed):
        if api_capitals and cca3 in api_capitals:
            caps[cca3] = api_capitals[cca3]
        elif cca3 in CAPITALS_FALLBACK:
            caps[cca3] = CAPITALS_FALLBACK[cca3]
        else:
            print(f"  WARNING: no capital for {cca3}")
    return caps


def main():
    out_path = os.path.join(os.path.dirname(__file__), "..", "data", "alliances.json")
    out_path = os.path.normpath(out_path)

    api_caps = fetch_capitals_from_restcountries()
    links    = build_links(ALLIANCES)
    capitals = collect_capitals(ALLIANCES, api_caps)

    alliances_out = [
        {k: v for k, v in a.items() if k != "strength"}
        for a in ALLIANCES
    ]

    result = {
        "alliances": alliances_out,
        "links":     links,
        "capitals":  capitals,
    }

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = os.path.getsize(out_path) / 1024
    print(f"Written {out_path}  ({size_kb:.1f} KB)")
    print(f"  {len(alliances_out)} alliances, {len(links)} links, {len(capitals)} capitals")


if __name__ == "__main__":
    main()
