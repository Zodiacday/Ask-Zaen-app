import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("""
    SELECT id, title, creator_publisher, genre_category, target_age_group, description 
    FROM kids_media 
    WHERE media_type='show' AND (genre_category LIKE '%Anime%' OR description LIKE '%anime%')
""")
anime_shows = c.fetchall()
print(f"Total anime shows in database: {len(anime_shows)}")
for s in anime_shows[:35]:
    desc = (s[5] or '').replace('\n', ' ')[:80]
    print(f"  [{s[0]}] \"{s[1]}\" | {s[2]} | {s[3]} | Desc: {desc}...")
