import sqlite3
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conn = sqlite3.connect(r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db')
c = conn.cursor()

c.execute("SELECT min(stimulation_score), max(stimulation_score), avg(stimulation_score), count(*) FROM kids_media WHERE stimulation_score IS NOT NULL")
print("Score stats:", c.fetchone())

c.execute("SELECT stimulation_label, min(stimulation_score), max(stimulation_score), count(*) FROM kids_media WHERE stimulation_score IS NOT NULL GROUP BY stimulation_label")
print("\nBy label:")
for r in c.fetchall():
    print(" ", r)

c.execute("SELECT id, title, creator_publisher, stimulation_score, stimulation_label, metadata_json FROM kids_media WHERE stimulation_score IS NOT NULL LIMIT 5")
print("\nSample records with scores:")
for r in c.fetchall():
    print(f"  [{r[0]}] {r[1]} | {r[2]} | Score: {r[3]} | Label: {r[4]}")
