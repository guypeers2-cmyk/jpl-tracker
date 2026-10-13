# Stijlcontrole over alle tabs: horizontale overflow, afgesneden tekst, te kleine tekst, en schermafbeeldingen.
# Gebruik: python3 scripts/style-audit.py [outdir]
import asyncio, json, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/style")
OUT.mkdir(parents=True, exist_ok=True)
URL = (ROOT / "index.html").as_uri()
JS_TABS = "[...document.querySelectorAll('nav.tabs button')].map(b=>b.textContent.trim())"
JS_CHECK = """()=>{
 const out={overflowX:document.documentElement.scrollWidth-document.documentElement.clientWidth,clipped:[],small:[]};
 const vis=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
 document.querySelectorAll('.tab-panel:not([hidden]) *, main *, .tabpane:not([hidden]) *').forEach(e=>{
   if(!vis(e)) return;
   const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
   if(own && e.scrollWidth>e.clientWidth+2 && getComputedStyle(e).overflow!=='visible') out.clipped.push((e.className||e.tagName)+': '+e.textContent.trim().slice(0,40));
   if(own){const fs=parseFloat(getComputedStyle(e).fontSize); if(fs<11 && e.textContent.trim().length>1) out.small.push(fs+'px '+e.textContent.trim().slice(0,30));}
 });
 out.clipped=out.clipped.slice(0,8); out.small=[...new Set(out.small)].slice(0,8);
 return out;}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w, label in ((1280, 'desk'), (375, 'mob')):
            ctx = await b.new_context(viewport={"width": w, "height": 900}, color_scheme="dark")
            pg = await ctx.new_page()
            await pg.route("**/*", lambda r: r.continue_() if r.request.url.startswith("file://") else r.abort())
            await pg.goto(URL, wait_until="load")
            await pg.add_style_tag(content="*,*::before,*::after{transition:none!important;animation:none!important}")
            await pg.wait_for_timeout(900)
            names = await pg.evaluate(JS_TABS)
            for i, name in enumerate(names):
                await pg.evaluate(f"document.querySelectorAll('nav.tabs button')[{i}].click()")
                await pg.wait_for_timeout(350)
                res = await pg.evaluate(JS_CHECK)
                slug = f"{i:02d}-{name.lower().replace(' ','')}-{label}"
                await pg.screenshot(path=str(OUT / (slug + '.png')), full_page=True)
                print(json.dumps({"tab": name, "view": label, **res}, ensure_ascii=False))
            await ctx.close()
        await b.close()
asyncio.run(main())
