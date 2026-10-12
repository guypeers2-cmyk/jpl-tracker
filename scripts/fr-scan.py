# Zoekt Nederlandse woorden in de Franse weergave. Gebruik: python3 scripts/fr-scan.py [url-of-pad]
import asyncio, re, sys, pathlib
from playwright.async_api import async_playwright
TARGET = sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent.joinpath("index.html").as_uri()
DUTCH = ["uitslagen","programma","speeldag","wedstrijden","vandaag","volgende","laatste","aftrap","geen","alle","beste","slechtste","punten","doelpunten","topscorers","bijgewerkt","vernieuwen","gepland","ploeg"]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width":1280,"height":900})
        await pg.goto(TARGET, wait_until="load"); await pg.wait_for_timeout(1500)
        await pg.click("#langToggle"); await pg.wait_for_timeout(800)
        txt = (await pg.inner_text("body")).lower()
        hits = {w: len(re.findall(r'\b'+w+r'\b', txt)) for w in DUTCH}
        hits = {k: v for k, v in hits.items() if v}
        print("OK: geen Nederlandse woorden in FR" if not hits else "NL-woorden in FR: " + str(hits))
        await b.close()
        sys.exit(1 if hits else 0)
asyncio.run(main())
