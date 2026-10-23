"""Check that the actually deployed edition contains only admitted research pages and files."""
from __future__ import annotations

import argparse
from pathlib import Path

PAGES = {"index", "research", "system", "methodology", "findings",
         "qa", "sources", "paper", "responses"}
REQUIRED = {
    *(f"{p}.html" for p in PAGES),
    "assets/companion.css",
    "assets/mark.svg",
    "data/research-installed-generation.json",
    "data/daily-demand-ml-robustness-v0.2.json",
    "SOURCE_COMMIT",
    "SOURCE_PROVENANCE.md",
    "RELEASE_MANIFEST.json",
}
DISALLOWED_TEXT = (
    "375.03", "11.75 gwh", "96.87%", "96.9%", "unserved energy fell",
    "optimal investment portfolio", "why is kerala susceptible",
    "new result · 6 october", "diagnose before prescribing",
    "energy data & modelling", "research under stress",
)
REQUIRED_TEXT = {
    "index.html": ("29,311.76", "354 / 365", "accounting"),
    "system.html": ("22,540.32", "29,311.76", "30,666.2569", "different"),
    "findings.html": ("353", "6 / 7", "5 / 7", "retrospective"),
    "qa.html": ("354", "11", "0.0001", "limitations"),
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True, type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    actual = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}
    if actual != REQUIRED:
        raise SystemExit(
            f"Frozen publication file-list discrepancy, added={sorted(actual - REQUIRED)}, "
            f"missing={sorted(REQUIRED - actual)}"
        )
    for page in PAGES:
        html = (root / f"{page}.html").read_text(encoding="utf-8").lower()
        for phrase in DISALLOWED_TEXT:
            if phrase in html:
                raise SystemExit(f"Unadmitted claim in {page}.html: {phrase}")
    for page, phrases in REQUIRED_TEXT.items():
        html = (root / page).read_text(encoding="utf-8").lower()
        for phrase in phrases:
            if phrase.lower() not in html:
                raise SystemExit(f"Frozen baseline missing {phrase} from {page}")
    for forbidden in ("forme/index.html", "assets/app.js", "data/site-data.json", "data/research-wind-terrain.json"):
        if (root / forbidden).exists():
            raise SystemExit(f"Historical scenario/conference asset leaked: {forbidden}")
    print(f"Frozen research site verified: {len(actual)} admitted files.")


if __name__ == "__main__":
    main()
