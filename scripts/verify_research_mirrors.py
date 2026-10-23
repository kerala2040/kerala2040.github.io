"""Verify frozen Kerala2040 website data against the pinned research checkout.

Usage:
    python scripts/verify_research_mirrors.py --research-dir research --website-dir .
No network requests; GitHub Actions checks out the pinned source first.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path


SOURCE_PATHS = {
    "solar": "data/evidence/solar/gsa2_nwic_district_paired_seasonality_2026_09_23.json",
    "wind": "data/evidence/gis/niwe_nwic_district_normalized_wind_terrain_2026_09_23.json",
    "generation": "data/evidence/generation/fy2024_25_generator_capacity_census.json",
    "demand_ml": "data/evidence/daily_demand_ml_robustness_v0_2_2026_10_06.json",
}


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def check_same(actual: object, expected: object, label: str) -> None:
    if actual != expected:
        raise SystemExit(f"Research evidence mismatch: {label}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--research-dir", type=Path, required=True)
    parser.add_argument("--website-dir", type=Path, default=Path("."))
    args = parser.parse_args()

    research = args.research_dir.resolve()
    site = args.website_dir.resolve()
    pointer = (site / "SOURCE_COMMIT").read_text(encoding="utf-8").strip()
    match = re.fullmatch(r"Research source: abhijith-sivaprasadan/kerala2040@([0-9a-f]{40})", pointer)
    if not match:
        raise SystemExit("Invalid immutable research-source pointer")
    source_sha = match.group(1)
    checked_out_sha = subprocess.check_output(
        ["git", "-C", str(research), "rev-parse", "HEAD"], text=True
    ).strip()
    check_same(checked_out_sha, source_sha, "checkout and pinned commit")

    def evidence(name: str) -> dict:
        return read_json(research / SOURCE_PATHS[name])

    def mirror(name: str, filename: str) -> dict:
        data = read_json(site / "data" / filename)
        check_same(data["source_repo"], "abhijith-sivaprasadan/kerala2040", f"{name} repository")
        check_same(data["source_commit"], source_sha, f"{name} source commit")
        check_same(data["source_path"], SOURCE_PATHS[name], f"{name} source path")
        return data

    solar, solar_site = evidence("solar"), mirror("solar", "research-solar-pvout.json")
    for key in ("classification", "reviewed_date", "statewide", "districts"):
        check_same(solar_site[key], solar[key], "solar " + key)
    check_same(solar_site["source_period"], solar["source"]["source_period"], "solar source period")
    check_same(len(solar_site["districts"]), 14, "solar district count")
    check_same(sum(d["finite_native_source_pixel_centres"] for d in solar_site["districts"]), 46241, "solar points")
    check_same(
        solar_site["release_limits"],
        {
            "source_reuse_rights_verified": solar["source"]["copyright_and_reuse_rights_independently_verified"],
            "installed_capacity_MW": solar["installed_capacity_MW"],
            "year_specific_hourly_generation_validated": solar["year_specific_hourly_generation_validated"],
            "model_admitted": solar["model_admitted"],
        },
        "solar limits",
    )
    if solar_site["release_limits"]["model_admitted"] is not False:
        raise SystemExit("Solar resource evidence must not be promoted to installed-capacity modelling")

    wind, wind_site = evidence("wind"), mirror("wind", "research-wind-terrain.json")
    for key in ("classification", "reviewed_date", "thresholds", "statewide", "spotlight_descriptive_example"):
        check_same(wind_site[key], wind[key], "wind " + key)
    check_same(
        wind_site["release_limits"],
        {
            "source_reuse_rights_verified": wind["source_reuse_rights_verified"],
            "eligible_area_km2": wind["eligible_area_km2"],
            "feasible_capacity_MW": wind["feasible_capacity_MW"],
            "hourly_generation_validated": wind["hourly_generation_validated"],
            "model_admitted": wind["model_admitted"],
        },
        "wind limits",
    )
    if wind_site["release_limits"]["feasible_capacity_MW"] is not None:
        raise SystemExit("Wind screen must not invent feasible MW")

    generation, generation_site = evidence("generation"), mirror("generation", "research-installed-generation.json")
    for key in (
        "classification",
        "snapshot_date",
        "official_headline",
        "official_sector_anchors_mw",
        "arithmetic_discrepancies_to_preserve",
        "release_gate",
    ):
        check_same(generation_site[key], generation[key], "generation " + key)
    check_same(generation_site["scope"], generation["source_boundary"], "generation scope")
    check_same(generation_site["official_source"], generation["sources"]["economic_review_2025_v1"], "generation source")
    if generation_site["release_gate"]["dispatch_model_ready_from_installed_capacity_alone"] is not False:
        raise SystemExit("Installed generation must not be promoted to dispatch-ready generation")

    ml = evidence("demand_ml")
    ml_site = read_json(site / "data/daily-demand-ml-robustness-v0.2.json")
    check_same(ml_site["research_source_commit"], source_sha, "daily ML source commit")
    check_same(ml_site["source_observed_rows"], ml["target"]["source_observed_rows"], "daily ML source rows")
    check_same(ml_site["matched_observed_rows"], ml["target"]["matched_observed_rows"], "daily ML matched rows")
    for key in (
        "classification",
        "rolling_design",
        "rolling_summary",
        "fold_weather_rmse_reduction_pct",
        "xgboost_feature_group_ablation",
        "interpretation",
        "limitations",
    ):
        check_same(ml_site[key], ml[key], "daily ML " + key)

    system = (site / "system.html").read_text(encoding="utf-8")
    sources_page = (site / "sources.html").read_text(encoding="utf-8")
    if 'id="capacity"' not in system or 'id="annual"' not in system:
        raise SystemExit("Scientific data page is missing the observed annual/capacity records")
    if 'data/research-installed-generation.json' not in sources_page:
        raise SystemExit("Source register does not link pinned reported generation data")
    if 'data/daily-demand-ml-robustness-v0.2.json' not in sources_page:
        raise SystemExit("Source register does not link the observed-daily experiment")

    print(f"Verified source-backed mirrors and daily-demand ML evidence at {source_sha}")


if __name__ == "__main__":
    main()
