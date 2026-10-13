# Toetsenbordcontrole: themawissel met Enter, en zichtbare focus op de CSV-knop (tabblad Stand).
# Gebruik: python3 scripts/keyboard-check.py
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
URL = (pathlib.Path(__file__).resolve().parent.parent / "index.html").as_uri()
async def main():
    ok = True
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1280, "height": 900})
        pg = await ctx.new_page()
        await pg.route("**/*", lambda r: r.continue_() if r.request.url.startswith("file://") else r.abort())
        await pg.goto(URL, wait_until="load")
        await pg.wait_for_timeout(600)
        await pg.focus("#themeToggle")
        before = await pg.evaluate("document.documentElement.classList.contains('light')")
        await pg.keyboard.press("Enter"); await pg.wait_for_timeout(200)
        after = await pg.evaluate("document.documentElement.classList.contains('light')")
        good = before != after; ok &= good
        print("themawissel met Enter:", "OK" if good else "FOUT")
        await pg.evaluate("[...document.querySelectorAll('nav.tabs button')].find(b=>/Stand/i.test(b.textContent)).click()")
        await pg.wait_for_timeout(400)
        await pg.focus("#expCsv")
        focused = await pg.evaluate("document.activeElement.id")
        outline = await pg.evaluate("getComputedStyle(document.activeElement).outlineStyle")
        good = focused == "expCsv" and outline != "none"; ok &= good
        print("CSV-knop focus met zichtbare outline:", "OK" if good else "FOUT")
        await b.close()
    if not ok: sys.exit(1)
    print("OK: toetsenbordcontrole geslaagd")
asyncio.run(main())
