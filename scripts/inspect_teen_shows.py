import sqlite3
import json
import io
import sys
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

teen_patterns = [
    r'\bteenagers?\b', r'\bhigh school\b', r'\badolescen(ce|ts?)\b', r'\bpuberty\b',
    r'\bdating\b', r'\bboyfriend\b', r'\bgirlfriend\b', r'\bcrush(es)?\b',
    r'\bromance\b', r'\blove triangle\b', r'\bhooking up\b', r'\bsex\b', r'\bdrugs?\b',
    r'\balcohol\b', r'\bparty(ing)?\b', r'\bprom\b'
]
teen_regex = re.compile('|'.join(teen_patterns), re.IGNORECASE)

c.execute("SELECT id, title, creator_publisher, genre_category, target_age_group, description FROM kids_media WHERE media_type='show'")
shows = c.fetchall()

teen_shows = []
for s in shows:
    desc = s[5] or ''
    title = s[1] or ''
    m = teen_regex.search(f"{title} {desc}")
    if m:
        teen_shows.append((s, m.group(0)))

print(f"Total Teen / High School shows found: {len(teen_shows)}")
for s, match in teen_shows[:35]:
    desc = (s[5] or '').replace('\n', ' ')[:90]
    print(f"[{s[0]}] \"{s[1]}\" | {s[2]} | {s[3]} (matched: {match}) | Desc: {desc}...")
