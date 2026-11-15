import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

inappropriate_nets = [
    'Adult Swim', 'Comedy Central', 'Bravo', 'A&E', 'Vice TV', 'VH1', 'MTV', 'TLC', 
    'TV Land', 'Bounce', 'Lifetime', 'USA Network', 'Freeform', 'The CW', 'CMT', 
    'Oprah Winfrey Network', 'Game Show Network', 'Outdoor Channel', 'Rooster Teeth',
    'Facebook Watch', 'IGTV', 'Dǒuyīn', 'Weibo', 'ТНТ', 'РЕН ТВ', 'Пятница', 'НТВ',
    'BET', 'Showtime', 'HBO', 'Paramount+ with Showtime', 'Sky Showcase', 'UPN'
]

print("=== SHOWS ON DEFINITELY INAPPROPRIATE / ADULT NETWORKS ===")
c.execute(f"""
    SELECT id, title, creator_publisher, genre_category, description 
    FROM kids_media 
    WHERE media_type='show' AND creator_publisher IN ({','.join(['?']*len(inappropriate_nets))})
""", inappropriate_nets)
rows = c.fetchall()
print(f"Total shows found: {len(rows)}")
for r in rows:
    desc = (r[4] or '').replace('\n', ' ')[:90]
    print(f"  [{r[0]}] \"{r[1]}\" | {r[2]} | {r[3]} | Desc: {desc}...")
