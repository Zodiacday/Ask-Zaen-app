import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("=== SHOWS ID RANGE AND ORIGINS ===")
c.execute("SELECT MIN(id), MAX(id), count(*) FROM kids_media WHERE media_type='show'")
min_id, max_id, count = c.fetchone()
print(f"Total shows: {count}, min_id: {min_id}, max_id: {max_id}")

c.execute("SELECT MIN(id), MAX(id), count(*) FROM kids_media WHERE media_type='show' AND id < 20000")
print(f"Shows with id < 20000: {c.fetchone()}")

c.execute("SELECT MIN(id), MAX(id), count(*) FROM kids_media WHERE media_type='show' AND id >= 20000")
print(f"Shows with id >= 20000: {c.fetchone()}")

# Let's see how many shows with id >= 20000 exist and sample them
c.execute("""
    SELECT id, title, creator_publisher, genre_category 
    FROM kids_media 
    WHERE media_type='show' AND id >= 20000 
    ORDER BY id ASC LIMIT 30
""")
print("\nFirst 30 shows with id >= 20000:")
for r in c.fetchall():
    print(f"  [{r[0]}] \"{r[1]}\" | {r[2]} | {r[3]}")
