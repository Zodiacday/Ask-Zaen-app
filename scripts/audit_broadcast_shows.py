import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("""
    SELECT id, title, creator_publisher, genre_category 
    FROM kids_media 
    WHERE media_type='show' AND creator_publisher IN ('ABC', 'CBS', 'NBC', 'ITV1')
      AND genre_category NOT LIKE '%Horror%' 
      AND genre_category NOT LIKE '%Crime%' 
      AND genre_category NOT LIKE '%Romance%'
    LIMIT 40
""")
print("=== SAMPLE ABC/CBS/NBC/ITV1 SHOWS ===")
for r in c.fetchall():
    print(f"  [{r[0]}] \"{r[1]}\" | {r[2]} | {r[3]}")
