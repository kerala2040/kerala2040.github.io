"""Guard against presentation-style copy on public research pages."""
from pathlib import Path

root = Path(__file__).resolve().parents[2]
pages = ("index.html", "research.html", "paper.html", "system.html",
         "methodology.html", "findings.html", "responses.html",
         "qa.html", "sources.html")
disallowed = (
    "Diagnose before prescribing",
    "There is a paper here",
    "The diagnosis exists",
    "five findings are strong enough",
    "Scientific red-team QA",
    "pass with disclosed limitations",
    "publication track",
    "for a Swedish audience",
    "not one giant model",
    "evidence-first",
    "fix the binding constraint",
)
errors = []
css = (root / "assets" / "companion.css").read_text(encoding="utf-8")
if '--display:"Playfair Display"' not in css:
    errors.append("assets/companion.css: Playfair Display heading stack was removed")
for name in pages:
    content = (root / name).read_text(encoding="utf-8").lower()
    if "family=Playfair+Display:ital,wght@0,500;0,600;1,500" not in content:
        errors.append(f"{name}: missing Playfair Display Google Fonts stylesheet")
    for phrase in disallowed:
        if phrase.lower() in content:
            errors.append(f"{name}: presentation phrasing found: {phrase}")
if errors:
    raise SystemExit("\n".join(errors))
print(f"Checked editorial language in {len(pages)} public pages.")
