import sqlite3
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT id, title, creator_publisher FROM kids_media WHERE LOWER(title) LIKE '%vhs%'")
rows = c.fetchall()
print(f"VHS items found: {len(rows)}")
for r in rows:
    print(f"  Deleting [{r[0]}] {r[1]} | {r[2]}")
    c.execute("DELETE FROM kids_media WHERE id = ?", (r[0],))

conn.commit()
conn.close()
print("VHS purge complete.")
