# Toegankelijkheidscontrole: axe in beide thema's, lichte voorkeur, taalwissel-lang, zichtbare focus.
# Gebruik: python3 scripts/a11y-check.py   (vereist: npm ci en playwright)
import asyncio, json, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
AXE = (ROOT / "node_modules/axe-core/axe.min.js").as_posix()
URL = (ROOT / "index.html").as_uri()
fails = []

async def open_page(b, theme=None, **kw):
    ctx = await b.new_context(**kw)
    if theme:
        await ctx.add_init_script(f"try{{localStorage.setItem('jpl-theme','{theme}')}}catch(e){{}}")
    pg = await ctx.new_page()
    await pg.route("**/*", lambda r: r.continue_() if r.request.url.startswith("file://") else r.abort())
    await pg.goto(URL, wait_until="load")
    await pg.add_script_tag(path=AXE)
    await pg.add_style_tag(content="*,*::before,*::after{transition:none!important;animation:none!important}")
    await pg.wait_for_timeout(600)
    return ctx, pg

async def axe_viol(pg):
    return await pg.evaluate("async()=>{const r=await axe.run(document,{resultTypes:['violations']});return r.violations.map(v=>v.id+':'+v.nodes.length)}")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # 34: axe in licht en donker thema, desktop en mobiel (thema vastgezet via localStorage)
        for w in (1280, 375):
            res = []
            for theme, name in (("l", "licht"), ("d", "donker")):
                ctx, pg = await open_page(b, theme=theme, viewport={"width": w, "height": 900})
                v = await axe_viol(pg)
                res.append(f"{name}: {v or 'geen'}")
                if v: fails.append(f"axe {w}px {name}")
                await ctx.close()
            print(f"axe {w}px", " | ".join(res))
        # 36: systeemvoorkeur licht wordt gevolgd bij eerste bezoek
        ctx, pg = await open_page(b, color_scheme="light", viewport={"width": 1280, "height": 900})
        light = await pg.evaluate("document.documentElement.classList.contains('light')")
        print("36 prefers-color-scheme licht → html.light:", light)
        if not light: fails.append("36")
        await ctx.close()
        # 37: taalwissel zet html lang
        ctx, pg = await open_page(b, viewport={"width": 1280, "height": 900})
        before = await pg.evaluate("document.documentElement.lang")
        await pg.click("#langToggle"); await pg.wait_for_timeout(300)
        after = await pg.evaluate("document.documentElement.lang")
        print(f"37 html lang: {before} → {after}")
        if before == after: fails.append("37")
        await ctx.close()
        # 40: zichtbare focusstijl bij toetsenbordfocus
        ctx, pg = await open_page(b, viewport={"width": 1280, "height": 900})
        await pg.keyboard.press("Tab")
        outline = await pg.evaluate("(()=>{const e=document.activeElement;const s=getComputedStyle(e);return {tag:e.tagName,id:e.id,outline:s.outlineStyle+' '+s.outlineWidth}})()")
        print("40 focus na Tab:", outline)
        if outline["outline"].startswith("none"): fails.append("40")
        await ctx.close()
        await b.close()
    if fails:
        print("MISLUKT:", ", ".join(fails)); sys.exit(1)
    print("OK: toegankelijkheidscontrole geslaagd")

asyncio.run(main())
