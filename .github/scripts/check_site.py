"""Check tracked HTML pages and their local links/assets without network requests."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import subprocess

ROOT = Path(__file__).resolve().parents[2]


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.links = []
        self.tags = set()
        self.feed(text)
        self.close()

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag)
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        for key in ("href", "src"):
            if attrs.get(key):
                self.links.append(attrs[key])


tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode("utf-8")
pages = {
    (ROOT / name).resolve(): Page((ROOT / name).read_text(encoding="utf-8"))
    for name in tracked.split("\0") if name.endswith(".html")
}
assert pages and (ROOT / "index.html").resolve() in pages, "No site entry page"
errors = []
for path, page in pages.items():
    if not {"html", "head", "title", "body"}.issubset(page.tags):
        errors.append(f"{path.relative_to(ROOT)}: missing basic HTML structure")
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc:
            continue
        target = (ROOT / unquote(url.path).lstrip("/") if url.path.startswith("/")
                  else path.parent / unquote(url.path) if url.path else path).resolve()
        if target.is_dir():
            target /= "index.html"
        if not target.is_relative_to(ROOT) or not target.is_file():
            errors.append(f"{path.relative_to(ROOT)}: missing local target {link}")
        elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
            errors.append(f"{path.relative_to(ROOT)}: missing fragment {link}")
if errors:
    raise SystemExit("\n".join(errors))
print(f"Validated {len(pages)} HTML pages and their local links/assets.")
