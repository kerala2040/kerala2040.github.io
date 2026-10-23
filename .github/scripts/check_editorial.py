"""Text-level checks that scientific claims remain within the frozen evidence scope."""
from pathlib import Path

root = Path(__file__).resolve().parents[2]
pages = ("index.html", "research.html", "paper.html", "system.html",
         "methodology.html", "findings.html", "responses.html",
         "qa.html", "sources.html")
disallowed = ("375.03", "11.75 GWh", "96.87%", "96.9%",
              "Diagnose before prescribing", "There is a paper here",
              "the diagnosis exists", "investment recommendation",
              "five findings are strong enough", "scientific red-team",
              "new result · 6 october 2026", "why is kerala susceptible",
              "research under stress", "energy data & modelling")
errors = []
css = (root / "assets/companion.css").read_text(encoding="utf-8")
if '"Playfair Display"' not in css or '--leaf:#20583e' not in css:
    errors.append("Original Kerala2040 green/serif visual design not preserved")
if "color-scheme:light" not in css:
    errors.append("Site style lacks color contrast baseline")
# Protect the established visual system during future scientific copy edits.
for fragment in ("--paper:#f6f3e9", "--leaf:#20583e", "Playfair Display",
                 ".hero-grid", ".data-strip", ".brand-mark", "prefers-reduced-motion"):
    if fragment not in css:
        errors.append(f"Original green research visual system missing: {fragment}")
home = (root / "index.html").read_text(encoding="utf-8")
for fragment in ('hero-grid"', 'class="hero-card"', 'class="visual-panel"',
                 'class="brand-mark"', 'class="data-strip"'):
    if fragment not in home:
        errors.append(f"Home page editorial layout regression: {fragment}")

for filename in pages:
    html = (root / filename).read_text(encoding="utf-8").lower()
    if "23 october 2026" not in html:
        errors.append(f"{filename}: missing frozen edition label")
    if 'class="brand-mark"' not in html:
        errors.append(f"{filename}: Malayalam brand mark missing")
    if "family=playfair+display" not in html:
        errors.append(f"{filename}: restored serif heading font missing")

    for phrase in disallowed:
        if phrase.lower() in html:
            errors.append(f"{filename}: speculative or promotional copy: {phrase}")
if errors:
    raise SystemExit("\n".join(errors))
print(f"Scientific editorial and claim boundaries checked on {len(pages)} public pages.")
