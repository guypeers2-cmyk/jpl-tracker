#!/usr/bin/env python3
"""Automatische update van de JPL tracker vanaf topscorervoetbal.nl.

Gebruik:
  python3 scripts/auto-update.py            # echte run (schrijft, commit, deploy)
  python3 scripts/auto-update.py --dry      # alleen lezen en vergelijken, niets schrijven of deployen

Veiligheid:
- Schrijft alleen als de berekende stand exact overeenkomt met de bronstand (wedstrijden, W-G-V, doelpunten, punten).
- Stopt bij elke twijfel (onbekende club, ontbrekend programma-tijdstip, conflicterende uitslag, onverwacht aantal spelers).
- Deploy gaat via staging -> smoke-test -> productie -> smoke-test.
- Vereist CLOUDFLARE_API_TOKEN en CLOUDFLARE_ACCOUNT_ID in de omgeving (of in ENV_FILE).
"""
import datetime
import html as htmlmod
import json
import os
import re
import subprocess
import sys
import urllib.request
import zoneinfo

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
LOG = os.path.join(ROOT, 'auto-update.log')
LOCK = '/tmp/jpl-auto-update.lock'
ENV_FILE = '/tmp/jpl-deploy.env'
TZ = zoneinfo.ZoneInfo('Europe/Brussels')
DRY = '--dry' in sys.argv

RESULTS_URL = 'https://www.topscorervoetbal.nl/jupiler-pro-league/standen-en-wedstrijden-2026/2027'
SCORERS_URL = 'https://www.topscorervoetbal.nl/jupiler-pro-league/seizoen-2026/2027'

TEAMS = {
    'Union St.-Gilloise': 'USG', 'Club Brugge': 'CLU', 'Gent': 'GNT', 'Charleroi': 'CHA',
    'Anderlecht': 'AND', 'Lommel': 'LOM', 'Genk': 'GNK', 'Standard Liège': 'STA',
    'Westerlo': 'WES', 'Oud-Heverlee Leuven': 'OHL', 'Mechelen': 'MEC', 'Sint-Truiden': 'STV',
    'Royal Antwerp': 'ANT', 'Zulte Waregem': 'ZWA', 'Beveren': 'BEV', 'Cercle Brugge': 'CER',
    'RAAL La Louvière': 'LAL', 'Kortrijk': 'KOR',
}
MONTHS = {'januari': 1, 'februari': 2, 'maart': 3, 'april': 4, 'mei': 5, 'juni': 6, 'juli': 7,
          'augustus': 8, 'september': 9, 'oktober': 10, 'november': 11, 'december': 12}


def log(msg):
    stamp = datetime.datetime.now(TZ).strftime('%Y-%m-%d %H:%M')
    line = f'[{stamp}] {msg}'
    print(line, flush=True)
    with open(LOG, 'a', encoding='utf8') as f:
        f.write(line + '\n')


def fetch_lines(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (JPL tracker auto-update)'})
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read().decode('utf8')
    t = re.sub(r'<script.*?</script>|<style.*?</style>', '', raw, flags=re.S)
    t = re.sub(r'<br\s*/?>', '\n', t)
    t = re.sub(r'<[^>]+>', '\n', t)
    t = htmlmod.unescape(t)
    return [l.strip() for l in t.split('\n') if l.strip()]


def parse_results(lines):
    res = []
    md = None
    i = 0
    while i < len(lines):
        m = re.fullmatch(r'Ronde (\d+)', lines[i])
        if m:
            md = int(m.group(1))
            i += 1
            continue
        if md is not None and ' - ' in lines[i]:
            a, _, b = lines[i].partition(' - ')
            if a in TEAMS and b in TEAMS and i + 2 < len(lines):
                sc = re.fullmatch(r'(\d+) - (\d+)', lines[i + 1])
                dt = re.fullmatch(r'(\d{1,2}) (\w+) (\d{4})', lines[i + 2])
                if sc and dt:
                    res.append({'md': md, 'home': TEAMS[a], 'away': TEAMS[b],
                                'hg': int(sc.group(1)), 'ag': int(sc.group(2)),
                                'date': f'{dt.group(3)}-{MONTHS[dt.group(2).lower()]:02d}-{int(dt.group(1)):02d}'})
                    i += 3
                    continue
        i += 1
    return res


def parse_standings(lines):
    start = lines.index('Union St.-Gilloise')
    end = lines.index('Alle wedstrijden Jupiler Pro League 2026/2027') if 'Alle wedstrijden Jupiler Pro League 2026/2027' in lines else len(lines)
    st = {}
    i = start
    while i < end - 6:
        if lines[i] in TEAMS and TEAMS[lines[i]] not in st:
            vals = lines[i + 1:i + 7]
            if all(re.fullmatch(r'\d+', v) for v in vals[:4]) and re.fullmatch(r'\d+-\d+', vals[4]) and re.fullmatch(r'\d+', vals[5]):
                gf, ga = vals[4].split('-')
                st[TEAMS[lines[i]]] = {'p': int(vals[0]), 'w': int(vals[1]), 'd': int(vals[2]), 'l': int(vals[3]),
                                       'gf': int(gf), 'ga': int(ga), 'pts': int(vals[5])}
                i += 7
                continue
        i += 1
    return st


def parse_scorers(lines):
    start = lines.index('Topscorerslijst Profvoetbal 1A 2026/2027')
    end = lines.index('TIP! Klik op het aantal doelpunten om de wedstrijden te zien waarin de speler heeft gescoord.')
    seg = lines[start:end]
    out = []
    for i in range(len(seg) - 6):
        name, team = seg[i], seg[i + 1]
        if name in TEAMS or team not in TEAMS:
            continue
        nat, age, pct, mpg, goals = seg[i + 2], seg[i + 3], seg[i + 4], seg[i + 5], seg[i + 6]
        if re.fullmatch(r'\d+', age) and re.fullmatch(r'[\d.]+%', pct) and re.fullmatch(r'\d+', mpg) and re.fullmatch(r'\d+', goals):
            out.append({'name': name, 'team': TEAMS[team], 'nat': nat, 'age': int(age), 'goals': int(goals),
                        'minPerGoal': int(mpg), 'share': float(pct.rstrip('%'))})
    return out


def parse_assists(lines):
    start = lines.index('Meeste assists in de Jupiler Pro League 2026/2027')
    end = next(i for i in range(start, len(lines)) if lines[i].startswith('Scoorde hattricks'))
    seg = lines[start:end]
    out = []
    for i in range(len(seg) - 4):
        name, team = seg[i], seg[i + 1]
        if name in TEAMS or team not in TEAMS:
            continue
        nat, age, n = seg[i + 2], seg[i + 3], seg[i + 4]
        if re.fullmatch(r'\d+', age) and re.fullmatch(r'\d+', n):
            out.append({'name': name, 'team': TEAMS[team], 'assists': int(n)})
    return out


def run(cmd, cwd=ROOT, env=None, timeout=900):
    r = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, timeout=timeout)
    return r.returncode, (r.stdout + r.stderr)


def ensure_playwright():
    rc, _ = run([sys.executable, '-c', 'import playwright'])
    if rc != 0:
        run([sys.executable, '-m', 'pip', 'install', '-q', 'playwright'], timeout=600)
        run([sys.executable, '-m', 'playwright', 'install', 'chromium'], timeout=900)


def main():
    if os.path.exists(LOCK):
        age = datetime.datetime.now().timestamp() - os.path.getmtime(LOCK)
        if age < 1800:
            log('overgeslagen: vorige run loopt nog')
            return 0
    open(LOCK, 'w').close()
    try:
        return update()
    finally:
        os.remove(LOCK)


def update():
    log('start' + (' (dry)' if DRY else ''))
    res_lines = fetch_lines(RESULTS_URL)
    ts_lines = fetch_lines(SCORERS_URL)
    results = parse_results(res_lines)
    standings = parse_standings(res_lines)
    scorers = parse_scorers(ts_lines)
    assists = parse_assists(ts_lines)
    log(f'bron: {len(results)} uitslagen, {len(standings)} clubs in stand, {len(scorers)} topscorers, {len(assists)} assists')
    if len(results) < 1 or len(standings) != 18:
        log('STOP: bron onvolledig of onherkenbaar, niets gewijzigd')
        return 1
    if len(scorers) < 30 or len(assists) < 10:
        log(f'STOP: topscorers/assists onherkenbaar ({len(scorers)}/{len(assists)}), niets gewijzigd')
        return 1

    # Assists: de bron toont alleen de top 10. Spelers die niet meer in de bron staan, behouden hun laatste waarde.
    data_js = os.path.join(ROOT, 'data.js')
    node_dump = run(['node', '-e', (
        "const fs=require('fs'),vm=require('vm');const c={};vm.createContext(c);"
        "vm.runInContext(fs.readFileSync('data.js','utf8')+';this.D=DATA;',c);"
        "console.log(JSON.stringify({assists:c.D.assists,scorers:c.D.scorers}))")])
    if node_dump[0] != 0:
        log('STOP: data.js kon niet gelezen worden: ' + node_dump[1][:300])
        return 1
    cur = json.loads(node_dump[1])
    amap = {a['name']: a for a in cur['assists']}
    for a in assists:
        amap[a['name']] = a
    merged_assists = sorted(amap.values(), key=lambda a: -a['assists'])
    sm = {x['name']: x for x in cur['scorers']}
    for x in scorers:
        sm[x['name']] = {**sm.get(x['name'], {}), **x}
    merged_scorers = sorted(sm.values(), key=lambda x: (-x['goals'], x['name']))
    for x in merged_scorers:
        x['assists'] = amap[x['name']]['assists'] if x['name'] in amap else 0

    payload = {
        'results': results,
        'standings': standings,
        'scorers': merged_scorers,
        'assists': merged_assists,
    }
    pj = os.path.join('/tmp', 'jpl-update-input.json')
    with open(pj, 'w', encoding='utf8') as f:
        json.dump(payload, f, ensure_ascii=False)

    args = ['node', 'scripts/apply-update.js', pj] + (['--dry'] if DRY else [])
    rc, outp = run(args)
    last = outp.strip().splitlines()[-1] if outp.strip() else ''
    try:
        info = json.loads(last)
    except Exception:
        log('STOP: onverwachte uitvoer van apply-update: ' + outp[:300])
        return 1
    if not info.get('ok'):
        log('STOP: ' + info.get('reason', 'onbekende fout') + ' — niets geschreven, niets gedeployd')
        return 1
    if not info.get('changed'):
        log('geen nieuwe wijzigingen')
        return 0
    log(f"wijzigingen: {info['newMatches']} nieuwe uitslagen, {info['scorers']} topscorers, {info['assists']} assists, speeldag {info['maxMd']}")
    if DRY:
        log('dry run: niet geschreven')
        return 0

    # Pagina's bijwerken (noscript, datumlabels, sitemap)
    rc, o = run(['node', 'scripts/pages-update.js'])
    if rc != 0:
        log('STOP: pages-update faalde: ' + o[:300])
        return 1
    rc, o = run(['node', 'validate.js'])
    if rc != 0:
        log('STOP: validatie faalt: ' + o[-300:])
        return 1
    run(['node', 'scripts/snapshot.js'])

    env = dict(os.environ)
    if os.path.exists(ENV_FILE):
        for line in open(ENV_FILE, encoding='utf8'):
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                env[k] = v
    if 'CLOUDFLARE_API_TOKEN' not in env or 'CLOUDFLARE_ACCOUNT_ID' not in env:
        log('STOP: geen Cloudflare-gegevens; data is geschreven maar niet gedeployd')
        return 1

    # Commit
    rc, author = run(['git', 'log', '-1', '--format=%an|%ae'])
    name, mail = author.strip().split('|', 1)
    summary = f"{info['newMatches']} uitslagen, speeldag {info['maxMd']}, topscorers {info['scorers']}"
    run(['git', 'add', 'data.js', 'index.html', 'app.js', 'sitemap.xml', 'calendar.ics', 'sw.js', 'CHANGELOG.md', 'snapshots'], env=env)
    run(['git', '-c', f'user.name={name}', '-c', f'user.email={mail}', 'commit', '-qm', f'Auto-update: {summary}'], env=env)

    # Deploy staging -> smoke -> productie -> smoke
    rc, o = run(['bash', 'scripts/deploy.sh', 'jpl-tracker-staging'], env=env)
    if rc != 0:
        log('STOP: staging-deploy faalt: ' + o[-300:])
        return 1
    ensure_playwright()
    rc, o = run([sys.executable, 'scripts/smoke.py', 'https://jpl-tracker-staging.pages.dev/'], env=env, timeout=600)
    if rc != 0 or 'OK |' not in o:
        log('STOP: smoke-test staging faalt: ' + o[-300:])
        return 1
    rc, o = run(['bash', 'scripts/deploy.sh', 'jpl-tracker'], env=env)
    if rc != 0:
        log('STOP: productie-deploy faalt: ' + o[-300:])
        return 1
    rc, o = run([sys.executable, 'scripts/smoke.py', 'https://jpl-tracker.pages.dev/'], env=env, timeout=600)
    if rc != 0 or 'OK |' not in o:
        log('LET OP: smoke-test productie faalt, zie RUNBOOK.md: ' + o[-300:])
        return 1
    log('klaar: live gezet en smoke-test geslaagd')
    return 0


if __name__ == '__main__':
    sys.exit(main())
