import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("=== SAMPLE SHOWS WITH NO 'Children' GENRE ===")
c.execute("""
    SELECT id, title, creator_publisher, genre_category 
    FROM kids_media 
    WHERE media_type = 'show' AND (genre_category NOT LIKE '%Children%' OR genre_category IS NULL)
    LIMIT 40
""")
for r in c.fetchall():
    print(f"  [{r[0]}] \"{r[1]}\" | {r[2]} | {r[3]}")
