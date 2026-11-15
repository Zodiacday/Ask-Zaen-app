import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("=== SHOWS WITH ID < 20000 (90 shows) ===")
c.execute("SELECT id, title, creator_publisher, genre_category FROM kids_media WHERE media_type='show' AND id < 20000 LIMIT 30")
for r in c.fetchall():
    print(f"  [{r[0]}] \"{r[1]}\" | {r[2]} | {r[3]}")

print("\n=== SHOWS WITH ID >= 20000 THAT HAVE 'Children' GENRE ===")
c.execute("SELECT count(*) FROM kids_media WHERE media_type='show' AND id >= 20000 AND genre_category LIKE '%Children%'")
cnt_children = c.fetchone()[0]
print(f"Count of shows >= 20000 with 'Children' genre: {cnt_children}")

c.execute("SELECT id, title, creator_publisher, genre_category FROM kids_media WHERE media_type='show' AND id >= 20000 AND genre_category LIKE '%Children%' LIMIT 20")
for r in c.fetchall():
    print(f"  [{r[0]}] \"{r[1]}\" | {r[2]} | {r[3]}")

print("\n=== NETWORKS / CHANNELS IN SHOWS >= 20000 ===")
c.execute("SELECT creator_publisher, count(*) FROM kids_media WHERE media_type='show' AND id >= 20000 GROUP BY creator_publisher ORDER BY count(*) DESC LIMIT 30")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]}")
