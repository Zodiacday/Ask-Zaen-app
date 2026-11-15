import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

broadcast_nets = ['BBC One', 'ITV1', 'ABC', 'CBS', 'NBC', 'Seven Network', 'Nine Network', 'Network 10']
print("="*70)
print(f"AUDITING SHOWS ON GENERAL BROADCAST NETWORKS: {', '.join(broadcast_nets)}")
print("="*70)

c.execute(f"""
    SELECT id, title, creator_publisher, genre_category, target_age_group, description 
    FROM kids_media 
    WHERE media_type='show' AND creator_publisher IN ({','.join(['?']*len(broadcast_nets))})
    ORDER BY creator_publisher, title
""", broadcast_nets)

shows = c.fetchall()
print(f"Total shows on these broadcast networks: {len(shows)}\n")

for s in shows[:60]:
    desc = (s[5] or '').replace('\n', ' ')[:100]
    print(f"[{s[0]}] {s[1]} | {s[2]} | {s[3]} | Age: {s[4]} | Desc: {desc}...")
