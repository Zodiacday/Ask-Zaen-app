import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT creator_publisher, count(*) FROM kids_media WHERE media_type='show' GROUP BY creator_publisher ORDER BY count(*) DESC")
rows = c.fetchall()
print(f"Total unique networks/publishers for shows: {len(rows)}")
for r in rows:
    print(f"  {r[0]}: {r[1]}")
