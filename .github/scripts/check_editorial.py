"""Text-level checks that scientific claims remain within the frozen evidence scope."""
from pathlib import Path

root = Path(__file__).resolve().parents[2]
pages = ("index.html", "research.html", "paper.html", "system.html",
         "methodology.html", "findings.html", "responses.html",
         "qa.html", "sources.html", "atlas.html")
disallowed = ("375.03", "11.75 GWh", "96.87%", "96.9%",
              "Diagnose before prescribing", "There is a paper here",
              "the diagnosis exists", "investment recommendation",
              "five findings are strong enough", "scientific red-team",
              "new result · 6 october 2026", "why is kerala susceptible",
              "research under stress", "energy data & modelling")
errors = []
css = (root / "assets/companion.css").read_text(encoding="utf-8")
for fragment in ("--forest:#0f3a2c", "--gold:#c9a44c", "--cream:#f3ecdc",
                 "--display:'Fraunces'", "--malayalam:'Noto Serif Malayalam'",
                 ".hero-card", ".data-strip", ".brand-mark", "prefers-reduced-motion"):
    if fragment not in css:
        errors.append(f"Kasavu research design token/element missing: {fragment}")
for asset in ("assets/kerala-icons.svg", "assets/kerala-horizon.svg",
              "assets/evidence-motion.css", "assets/evidence-atlas.js"):
    if not (root / asset).exists():
        errors.append(f"Kerala design asset missing: {asset}")
home = (root / "index.html").read_text(encoding="utf-8")
for fragment in ('class="hero-card"', 'class="card-icon"', 'class="stat-icon"',
                 'class="brand-mark"', 'class="data-strip"'):
    if fragment not in home:
        errors.append(f"Home page Kerala2040 component regression: {fragment}")

if not (root / "atlas.html").is_file():
    errors.append("Interactive evidence atlas missing")
else:
    atlas = (root / "atlas.html").read_text(encoding="utf-8")
    for v in ('data-viz="capacity"', 'data-viz="folds"', 'data-viz="ablation"',
              'data-viz="coverage"', 'data-viz="trends"', 'data-viz="sites"'):
        if v not in atlas:
            errors.append(f"Visual regression: missing {v}")
for filename in pages:
    html = (root / filename).read_text(encoding="utf-8").lower()
    if "23 october 2026" not in html:
        errors.append(f"{filename}: missing frozen edition label")
    if 'class="brand-mark"' not in html:
        errors.append(f"{filename}: Malayalam brand mark missing")
    if "family=fraunces" not in html:
        errors.append(f"{filename}: supplied Fraunces heading font missing")

    for phrase in disallowed:
        if phrase.lower() in html:
            errors.append(f"{filename}: speculative or promotional copy: {phrase}")
if errors:
    raise SystemExit("\n".join(errors))
print(f"Scientific editorial and claim boundaries checked on {len(pages)} public pages.")
