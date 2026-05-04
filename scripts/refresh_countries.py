#!/usr/bin/env python3
"""
refresh_countries.py
--------------------
Fetches country metadata from restcountries.com and economic indicators
from the World Bank API, then assembles a unified `data/countries.json`.

Usage:
    python scripts/refresh_countries.py [--out PATH] [--timeout N] [--workers N]

Dependencies:
    pip install requests
"""

import argparse
import json
import logging
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

RESTCOUNTRIES_BASE = "https://restcountries.com/v3.1/all"
# The v3.1 API enforces a max of 9 fields per request AND requires at least one
# field to be specified (bare /all returns 400).  We split into two calls.
RC_FIELDS_GEO  = "cca2,cca3,name,capital,population,area,languages,borders,landlocked"
RC_FIELDS_META = "cca2,subregion,region,translations"

# Common browser-like User-Agent to avoid bot-rejection by some CDNs
HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; refresh_countries/1.0; +educational-project)"
}

# World Bank API – MRTE strategy returns the most recent non-null value
WB_BASE = "https://api.worldbank.org/v2/country/{iso2}/indicator/{indicator}"
WB_PARAMS = {
    "format": "json",
    "mrv": 5,          # look back up to 5 years to find a non-null value
    "gapfill": "Y",    # allow gap-filling across years
    "per_page": 5,
}

# Indicator codes
WB_GDP          = "NY.GDP.MKTP.CD"   # GDP (current USD)
WB_GDP_PER_CAP  = "NY.GDP.PCAP.CD"   # GDP per capita (current USD)
WB_GROWTH       = "NY.GDP.MKTP.KD.ZG" # GDP growth (annual %)
WB_MILITARY     = "MS.MIL.XPND.GD.ZS" # Military expenditure (% of GDP)

DEFAULT_OUT     = Path(__file__).resolve().parent.parent / "data" / "countries.json"
DEFAULT_TIMEOUT = 15   # seconds per HTTP request
DEFAULT_WORKERS = 8    # parallel WB calls

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def fetch_json(url: str, params: dict | None = None, timeout: int = DEFAULT_TIMEOUT) -> dict | list:
    """GET a URL and return parsed JSON; raises on HTTP errors."""
    resp = requests.get(url, params=params, timeout=timeout, headers=HTTP_HEADERS)
    resp.raise_for_status()
    return resp.json()


def wb_latest_value(data: list) -> float | None:
    """
    Extract the most recent non-null value from a World Bank response page
    (the second element of the two-element list returned by the API).
    """
    if not data or len(data) < 2:
        return None
    for entry in data[1]:
        if entry.get("value") is not None:
            return entry["value"]
    return None


def fetch_wb_indicator(iso2: str, indicator: str, timeout: int) -> float | None:
    """Return the latest available value for a single WB indicator, or None."""
    url = WB_BASE.format(iso2=iso2, indicator=indicator)
    try:
        data = fetch_json(url, params=WB_PARAMS, timeout=timeout)
        return wb_latest_value(data)
    except Exception as exc:
        log.debug("WB %s/%s failed: %s", iso2, indicator, exc)
        return None


def fetch_wb_data(iso2: str, timeout: int) -> dict:
    """Fetch all four WB indicators for a country (sequentially, shared connection)."""
    return {
        "pib_usd":            fetch_wb_indicator(iso2, WB_GDP,         timeout),
        "pib_par_hab":        fetch_wb_indicator(iso2, WB_GDP_PER_CAP, timeout),
        "croissance_pct":     fetch_wb_indicator(iso2, WB_GROWTH,      timeout),
        "dep_militaire_pct_pib": fetch_wb_indicator(iso2, WB_MILITARY, timeout),
    }


# ---------------------------------------------------------------------------
# Country normalisation
# ---------------------------------------------------------------------------

def normalise_country(rc: dict) -> dict:
    """
    Convert a restcountries.com v3 entry to the base fields we need.
    Economic fields are left as None – filled in later by fetch_wb_data().
    """
    cca2 = rc.get("cca2", "")
    cca3 = rc.get("cca3", "")

    # Official name – prefer French translation, fall back to English / common
    translations = rc.get("translations", {})
    nom_officiel = (
        translations.get("fra", {}).get("official")
        or rc.get("name", {}).get("official")
        or rc.get("name", {}).get("common", "")
    )

    # Capital
    capitals = rc.get("capital", [])
    capitale = capitals[0] if capitals else None

    # Population
    population = rc.get("population")

    # Area (km²)
    superficie_km2 = rc.get("area")

    # Languages
    langues = list(rc.get("languages", {}).values())

    # Borders (list of cca3 codes)
    frontieres = rc.get("borders", [])

    # Sea access
    landlocked = rc.get("landlocked", False)
    acces_mer = not landlocked

    # Region / sub-region
    region = rc.get("subregion") or rc.get("region") or None

    return {
        "id":              cca3,
        "cca2":            cca2,
        "nom_officiel":    nom_officiel,
        "capitale":        capitale,
        "population":      population,
        "superficie_km2":  superficie_km2,
        "langues":         langues,
        "frontieres":      frontieres,
        "acces_mer":       acces_mer,
        "region":          region,
        # Economic – populated below
        "pib_usd":               None,
        "pib_par_hab":           None,
        "croissance_pct":        None,
        "dep_militaire_pct_pib": None,
    }


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def run(out_path: Path, timeout: int, workers: int) -> None:
    # ── 1. Fetch all countries from restcountries (two split calls) ───────────
    log.info("Fetching geographic data from restcountries.com …")
    geo_list  = fetch_json(RESTCOUNTRIES_BASE, params={"fields": RC_FIELDS_GEO},  timeout=timeout)
    log.info("Fetching name/region/translation data …")
    meta_list = fetch_json(RESTCOUNTRIES_BASE, params={"fields": RC_FIELDS_META}, timeout=timeout)

    # Merge by cca2
    meta_by_cca2 = {c["cca2"]: c for c in meta_list if c.get("cca2")}
    for entry in geo_list:
        cca2 = entry.get("cca2", "")
        entry.update(meta_by_cca2.get(cca2, {}))

    log.info("  → %d countries assembled.", len(geo_list))
    countries = [normalise_country(rc) for rc in geo_list]
    # Index by cca2 for quick look-up during WB enrichment
    by_cca2 = {c["cca2"]: c for c in countries if c["cca2"]}

    # ── 2. Enrich with World Bank data (parallel) ──────────────────────────
    log.info("Fetching World Bank indicators (workers=%d) …", workers)
    total = len(by_cca2)
    done  = 0
    t0    = time.time()

    def enrich(iso2: str) -> tuple[str, dict]:
        return iso2, fetch_wb_data(iso2, timeout)

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(enrich, iso2): iso2 for iso2 in by_cca2}
        for future in as_completed(futures):
            iso2, wb = future.result()
            by_cca2[iso2].update(wb)
            done += 1
            if done % 25 == 0 or done == total:
                elapsed = time.time() - t0
                log.info("  → %d / %d done (%.0fs)", done, total, elapsed)

    # ── 3. Remove the temporary cca2 helper field ──────────────────────────
    for c in countries:
        c.pop("cca2", None)

    # ── 4. Sort alphabetically and save ───────────────────────────────────
    countries.sort(key=lambda c: c["nom_officiel"])

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(countries, fh, ensure_ascii=False, indent=2)

    size_kb = out_path.stat().st_size / 1024
    log.info("✔  Saved %d countries → %s (%.1f KB)", len(countries), out_path, size_kb)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Refresh data/countries.json from restcountries.com + World Bank."
    )
    parser.add_argument(
        "--out", type=Path, default=DEFAULT_OUT,
        metavar="PATH",
        help=f"Output JSON file (default: {DEFAULT_OUT})",
    )
    parser.add_argument(
        "--timeout", type=int, default=DEFAULT_TIMEOUT,
        metavar="N",
        help=f"HTTP request timeout in seconds (default: {DEFAULT_TIMEOUT})",
    )
    parser.add_argument(
        "--workers", type=int, default=DEFAULT_WORKERS,
        metavar="N",
        help=f"Parallel World Bank threads (default: {DEFAULT_WORKERS})",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    try:
        run(out_path=args.out, timeout=args.timeout, workers=args.workers)
    except KeyboardInterrupt:
        log.warning("Interrupted by user.")
        sys.exit(1)
    except Exception as exc:
        log.error("Fatal error: %s", exc, exc_info=True)
        sys.exit(2)
