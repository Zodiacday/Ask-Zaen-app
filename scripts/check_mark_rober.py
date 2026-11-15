import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT id, title, creator_publisher FROM kids_media WHERE LOWER(creator_publisher) LIKE '%mark rober%'")
rows = c.fetchall()
print(f"Mark Rober videos: {len(rows)}")
for r in rows:
    print(r)
