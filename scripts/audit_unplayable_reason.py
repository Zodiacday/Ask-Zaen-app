import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT id, title, creator_publisher, platform_url, stimulation_score, stimulation_label, metadata_json FROM kids_media WHERE id IN (14, 163, 165, 177)")
for r in c.fetchall():
    print(f"[{r[0]}] {r[1]}")
    print(f"  URL: {r[3]}")
    print(f"  Score: {r[4]}, Label: {r[5]}")
    print(f"  Metadata: {r[6][:300]}...")
