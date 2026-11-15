import sqlite3
import json
import io
import sys
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("="*70)
print("COMPREHENSIVE AI AUDIT - STAGE 1: SYSTEMATIC INVENTORY")
print("="*70)

# 1. Total counts by media type
c.execute("SELECT media_type, count(*) FROM kids_media GROUP BY media_type")
counts = dict(c.fetchall())
for mtype, cnt in sorted(counts.items()):
    print(f"  {mtype:10s}: {cnt:,}")

# 2. Top 50 Creators/Networks for SHOWS
print("\n" + "="*50)
print("SHOWS: TOP 50 NETWORKS / CREATORS")
print("="*50)
c.execute("""
    SELECT creator_publisher, count(*) 
    FROM kids_media 
    WHERE media_type='show' 
    GROUP BY creator_publisher 
    ORDER BY count(*) DESC 
    LIMIT 50
""")
for r in c.fetchall():
    print(f"  {r[0] or 'Unknown'}: {r[1]}")

# 3. Top 40 Genres for SHOWS
print("\n" + "="*50)
print("SHOWS: TOP 40 GENRE COMBINATIONS")
print("="*50)
c.execute("""
    SELECT genre_category, count(*) 
    FROM kids_media 
    WHERE media_type='show' 
    GROUP BY genre_category 
    ORDER BY count(*) DESC 
    LIMIT 40
""")
for r in c.fetchall():
    print(f"  {r[0] or 'None'}: {r[1]}")
