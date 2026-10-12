# Controleert de kopstructuur: precies één h1 en geen overgeslagen niveaus (h2 -> h4 etc.).
import sys, pathlib
from playwright.sync_api import sync_playwright
TARGET = sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent.joinpath("index.html").as_uri()
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.goto(TARGET, wait_until="load"); pg.wait_for_timeout(1200)
    levels = pg.evaluate("()=>[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(h=>h.offsetParent!==null||getComputedStyle(h).display!=='none').map(h=>+h.tagName[1])")
    b.close()
h1 = levels.count(1)
jumps = [(a, c) for a, c in zip(levels, levels[1:]) if c > a + 1]
print(f"h1: {h1}, koppen: {len(levels)}, overgeslagen niveaus: {jumps}")
sys.exit(0 if h1 == 1 and not jumps else 1)
