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
if "Playfair Display" in css or "var(--display)" in css:
    errors.append("Editorial/site CSS must use restrained scientific typography")
if "color-scheme:light" not in css:
    errors.append("Site style lacks color contrast baseline")
for filename in pages:
    html = (root / filename).read_text(encoding="utf-8").lower()
    if "23 october 2026" not in html:
        errors.append(f"{filename}: missing frozen edition label")
    for phrase in disallowed:
        if phrase.lower() in html:
            errors.append(f"{filename}: speculative or promotional copy: {phrase}")
if errors:
    raise SystemExit("\n".join(errors))
print(f"Scientific editorial and claim boundaries checked on {len(pages)} public pages.")
