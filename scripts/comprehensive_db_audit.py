import sqlite3
import json
import io
import sys
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
print(f"=== DATABASE TABLES IN {db_path} ===")
for t in tables:
    t_name = t[0]
    c.execute(f"SELECT count(*) FROM [{t_name}]")
    cnt = c.fetchone()[0]
    print(f"Table '{t_name}': {cnt:,} rows")

print("\n=== MEDIA TYPE BREAKDOWN IN kids_media ===")
c.execute("SELECT media_type, count(*) FROM kids_media GROUP BY media_type")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]:,}")

print("\n=== SHOW GENRES BREAKDOWN (Top 30) ===")
c.execute("SELECT genre_category, count(*) FROM kids_media WHERE media_type='show' GROUP BY genre_category ORDER BY count(*) DESC LIMIT 30")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== TOP CREATOR/PUBLISHERS FOR SHOWS (Top 25) ===")
c.execute("SELECT creator_publisher, count(*) FROM kids_media WHERE media_type='show' GROUP BY creator_publisher ORDER BY count(*) DESC LIMIT 25")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== TOP CREATOR/PUBLISHERS FOR VIDEOS (Top 25) ===")
c.execute("SELECT creator_publisher, count(*) FROM kids_media WHERE media_type='video' GROUP BY creator_publisher ORDER BY count(*) DESC LIMIT 25")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== STIMULATION LABELS FOR VIDEOS ===")
c.execute("SELECT stimulation_label, count(*) FROM kids_media WHERE media_type='video' GROUP BY stimulation_label")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]}")
