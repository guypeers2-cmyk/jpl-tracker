#!/usr/bin/env python3
"""Nieuws en gele kaarten voor de JPL tracker.

- Nieuws: RSS-feeds van voetbalkrant.com, voetbalprimeur.be en nieuwsblad.be, gefilterd op JPL-clubs.
- Gele kaarten: top 5 van de statistiekpagina van voetbalkrant.com (seizoen 2026/2027).
Beide functies geven None terug bij een fout, zodat de bestaande data dan blijft staan.
"""
import datetime
import html as htmlmod
import re
import urllib.request
import xml.etree.ElementTree as ET
import zoneinfo

TZ = zoneinfo.ZoneInfo('Europe/Brussels')
FEEDS = [
    ('https://www.voetbalkrant.com/rss', 'Voetbalkrant'),
    ('https://www.voetbalprimeur.be/rss.xml', 'Voetbalprimeur'),
    ('https://www.nieuwsblad.be/rss', 'Nieuwsblad'),
]
CARDS_URL = 'https://www.voetbalkrant.com/belgie/jupiler-pro-league/geschiedenis/2026-2027/statistieken'

# zoekterm in titel -> clubcode
CLUB_TERMS = {
    'Club Brugge': 'CLU', 'Brugge': 'CLU', 'Anderlecht': 'AND', 'Genk': 'GNK', 'Gent': 'GNT',
    'Union': 'USG', 'Antwerp': 'ANT', 'Charleroi': 'CHA', 'Standard': 'STA', 'Westerlo': 'WES',
    'Beveren': 'BEV', 'Lommel': 'LOM', 'Mechelen': 'MEC', 'Kortrijk': 'KOR', 'Cercle': 'CER',
    'STVV': 'STV', 'Sint-Truiden': 'STV', 'Zulte': 'ZWA', 'Leuven': 'OHL', 'Louvière': 'LAL',
    'Jupiler': None,
}
CARD_CLUBS = {
    'Anderlecht': 'AND', 'Club Brugge': 'CLU', 'KV Mechelen': 'MEC', 'SK Beveren': 'BEV', 'KRC Genk': 'GNK',
    'Union SG': 'USG', 'STVV': 'STV', 'Westerlo': 'WES', 'Royal Antwerp': 'ANT', 'Antwerp': 'ANT',
    'Charleroi': 'CHA', 'Standard': 'STA', 'KAA Gent': 'GNT', 'Gent': 'GNT', 'Zulte Waregem': 'ZWA',
    'Cercle Brugge': 'CER', 'Lommel': 'LOM', 'KV Kortrijk': 'KOR', 'Kortrijk': 'KOR', 'RAAL La Louvière': 'LAL',
    'OH Leuven': 'OHL', 'OH Leuven ': 'OHL', 'Oud-Heverlee Leuven': 'OHL',
}


def _get(url, timeout=60):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (JPL tracker)'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def _club_code(title):
    for term, code in CLUB_TERMS.items():
        if code and term in title:
            return code
    return None


def fetch_news(days=21, limit=12):
    """Geeft lijst van {date, source, title, url} of None bij een fout."""
    try:
        items = {}
        now = datetime.datetime.now(TZ).date()
        for url, source in FEEDS:
            root = ET.fromstring(_get(url))
            for it in root.iter('item'):
                title = (it.findtext('title') or '').strip()
                link = (it.findtext('link') or '').strip()
                pub = it.findtext('pubDate') or ''
                if not title or not link or not pub:
                    continue
                try:
                    d = datetime.datetime.strptime(pub[:25].strip(), '%a, %d %b %Y %H:%M:%S').replace(tzinfo=datetime.timezone.utc).astimezone(TZ).date()
                except ValueError:
                    try:
                        d = datetime.datetime.fromisoformat(pub.strip()).astimezone(TZ).date()
                    except ValueError:
                        continue
                if (now - d).days > days or (now - d).days < 0:
                    continue
                has_jpl = any(term in title for term in CLUB_TERMS) and ('Jupiler' in title or _club_code(title) or 'Pro League' in title)
                if source == 'Nieuwsblad' and not has_jpl:
                    continue
                if not _club_code(title) and 'Jupiler' not in title and 'Pro League' not in title:
                    continue
                key = title.lower()
                if key not in items:
                    items[key] = {'date': d.isoformat(), 'source': source, 'title': title, 'url': link}
        ordered = sorted(items.values(), key=lambda x: x['date'], reverse=True)
        out, per_src = [], {}
        for it in ordered:  # max 5 per bron, zodat niet een bron alles vult
            if per_src.get(it['source'], 0) >= 5:
                continue
            per_src[it['source']] = per_src.get(it['source'], 0) + 1
            out.append(it)
            if len(out) >= limit:
                break
        return out if len(out) >= 3 else None
    except Exception:
        return None


def fetch_yellow_leaders():
    """Top 5 gele kaarten: [{name, team, n}] of None bij een fout."""
    try:
        raw = _get(CARDS_URL).decode('utf8', 'ignore')
        t = re.sub(r'<script.*?</script>|<style.*?</style>', '', raw, flags=re.S)
        t = htmlmod.unescape(re.sub(r'<[^>]+>', '\n', t))
        lines = [l.strip() for l in t.split('\n') if l.strip()]
        i = next(k for k, l in enumerate(lines) if l == 'Meeste gele kaarten' and k + 1 < len(lines) and lines[k + 1] == '1.')
        seg = lines[i + 1:i + 60]
        end = seg.index('Meer statistieken')
        seg = seg[:end]
        out = []
        for k in range(0, len(seg) - 3, 4):
            rank, name, team, n = seg[k], seg[k + 1], seg[k + 2], seg[k + 3]
            if not re.fullmatch(r'\d+\.', rank) or not re.fullmatch(r'\d+', n):
                break
            code = CARD_CLUBS.get(team)
            if not code:
                return None
            parts = name.split(' ')
            # bron: "Achternaam Voornaam" -> "Voornaam Achternaam"
            pretty = ' '.join([parts[-1]] + parts[:-1]) if len(parts) > 1 else name
            out.append({'name': pretty, 'team': code, 'n': int(n)})
        if len(out) < 5:
            return None
        return out[:5]
    except Exception:
        return None


if __name__ == '__main__':
    import json
    print(json.dumps({'news': fetch_news(), 'yellow': fetch_yellow_leaders()}, ensure_ascii=False, indent=1))
