# Smoketest na deploy.
# Controleert: JS-fouten, verborgen update-banner, titel, tabs, toetsenbord, voettekst
# en verminderde beweging (prefers-reduced-motion).
# Bij succes op een staging-URL wordt .staging-ok geschreven met het build-ID.
# Productie-deploy (deploy.sh) weigert zonder die vlag met hetzelfde build-ID.
import asyncio, pathlib, re, sys
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "https://jpl-tracker.pages.dev/"
ROOT = pathlib.Path(__file__).resolve().parent.parent


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
        tabs = await pg.evaluate("()=>document.querySelectorAll('nav.tabs button').length")
        foot = await pg.inner_text("#footCount")
        build = await pg.evaluate("()=>{const m=document.querySelector('meta[name=build]');return m?m.content:''}")
        await pg.focus("nav.tabs button")
        for _ in range(2):
            await pg.keyboard.press("Tab")
        keyboard = await pg.evaluate("()=>document.activeElement&&document.activeElement.tagName!=='BODY'")
        await pg.close()

        ctx = await b.new_context(reduced_motion="reduce", viewport={"width": 375, "height": 812})
        rp = await ctx.new_page()
        await rp.goto(URL, wait_until="load")
        await rp.wait_for_timeout(1500)
        slow = await rp.evaluate(
            "()=>[...document.querySelectorAll('*')].filter(e=>{const c=getComputedStyle(e);"
            "return parseFloat(c.transitionDuration)>0.01||parseFloat(c.animationDuration)>0.01}).length")
        await ctx.close()
        await b.close()

        ok = (not errs) and banner and ("Jupiler" in title) and tabs >= 7 and bool(keyboard) \
            and "uitslagen" in foot and slow == 0
        print(("OK" if ok else "FOUT"), "| titel:", title[:40], "| banner verborgen:", banner,
              "| tabs:", tabs, "| toetsenbord:", bool(keyboard), "| voettekst:", foot,
              "| reduced-motion langzame animaties:", slow, "| build:", build, "| js-fouten:", errs)

        local = re.search(r'name="build" content="([^"]+)"', (ROOT / "index.html").read_text(encoding="utf-8"))
        local_build = local.group(1) if local else ""
        if ok and "staging" in URL and build and build == local_build:
            (ROOT / ".staging-ok").write_text(build + "\n", encoding="utf-8")
            print("staging-vlag geschreven:", build)
        elif ok and "staging" in URL:
            print("GEEN vlag: live build", build, "komt niet overeen met lokaal", local_build, "(opnieuw deployen)")
        sys.exit(0 if ok else 1)


asyncio.run(main())
