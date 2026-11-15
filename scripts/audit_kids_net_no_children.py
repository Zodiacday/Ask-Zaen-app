import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

kids_networks = [
    '%cbeebies%', '%pbs%', '%nickelodeon%', '%nick jr%', '%disney%', '%cartoon network%', 
    '%treehouse%', '%ytv%', '%sesame%', '%wiggles%'
]

query = """
    SELECT id, title, creator_publisher, genre_category 
    FROM kids_media 
    WHERE media_type='show' 
      AND (genre_category NOT LIKE '%Children%' OR genre_category IS NULL)
      AND (""" + " OR ".join(["LOWER(creator_publisher) LIKE ?" for _ in kids_networks]) + ")"

c.execute(query, kids_networks)
kids_net_no_children = c.fetchall()
print(f"Total shows on kids networks without 'Children' tag: {len(kids_net_no_children)}")
for s in kids_net_no_children[:40]:
    print(f"  [{s[0]}] \"{s[1]}\" | {s[2]} | {s[3]}")
