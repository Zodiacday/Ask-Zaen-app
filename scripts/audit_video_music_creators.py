import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("="*60)
print("AUDITING REMAINING 6,891 VIDEOS")
print("="*60)
c.execute("SELECT creator_publisher, count(*) FROM kids_media WHERE media_type='video' GROUP BY creator_publisher ORDER BY count(*) DESC LIMIT 35")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n" + "="*60)
print("AUDITING REMAINING 4,771 MUSIC TRACKS")
print("="*60)
c.execute("SELECT creator_publisher, count(*) FROM kids_media WHERE media_type='music' GROUP BY creator_publisher ORDER BY count(*) DESC LIMIT 35")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]}")
