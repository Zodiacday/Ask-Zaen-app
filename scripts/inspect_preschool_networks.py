import sqlite3
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conn = sqlite3.connect(r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db')
c = conn.cursor()

def list_shows(publisher):
    c.execute("SELECT id, title, target_age_group FROM kids_media WHERE media_type='show' AND creator_publisher=? ORDER BY title LIMIT 30", (publisher,))
    rows = c.fetchall()
    print(f"\n--- {publisher} (Total {len(rows)} shows) ---")
    for r in rows:
        print(f"  [{r[0]}] {r[1]} (Age: {r[2]})")

list_shows('Nick Jr.')
list_shows('Disney Junior')
list_shows('CBeebies')
list_shows('PBS Kids')
