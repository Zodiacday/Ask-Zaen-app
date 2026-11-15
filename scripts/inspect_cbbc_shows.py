import sqlite3
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conn = sqlite3.connect(r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db')
c = conn.cursor()

c.execute("SELECT id, title, creator_publisher, target_age_group FROM kids_media WHERE media_type='show' AND creator_publisher='CBBC' ORDER BY title LIMIT 30")
rows = c.fetchall()
print(f"CBBC shows ({len(rows)}):")
for r in rows:
    print(f"  [{r[0]}] {r[1]} (Age: {r[3]})")
