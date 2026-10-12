# Smoketest na deploy: laadt de pagina, controleert op JS-fouten, verborgen update-banner en de titel.
import asyncio, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else "https://jpl-tracker.pages.dev/"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 375, "height": 812})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)[:150]))
        await pg.goto(URL, wait_until="load")
        await pg.wait_for_timeout(3000)
        banner = await pg.evaluate("()=>{const b=document.getElementById('updBox');return b?b.hidden:true}")
        title = await pg.title()
        ok = not errs and banner and "Jupiler" in title
        print(("OK" if ok else "FOUT"), "| titel:", title[:40], "| banner verborgen:", banner, "| js-fouten:", errs)
        await b.close()
        sys.exit(0 if ok else 1)
asyncio.run(main())
