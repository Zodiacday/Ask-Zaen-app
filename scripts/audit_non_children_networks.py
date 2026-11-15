import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("=== NETWORKS OF SHOWS LACKING 'Children' TAG ===")
c.execute("""
    SELECT creator_publisher, count(*) 
    FROM kids_media 
    WHERE media_type='show' AND (genre_category NOT LIKE '%Children%' OR genre_category IS NULL)
    GROUP BY creator_publisher 
    ORDER BY count(*) DESC 
    LIMIT 35
""")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== GENRES OF SHOWS LACKING 'Children' TAG ===")
c.execute("""
    SELECT genre_category, count(*) 
    FROM kids_media 
    WHERE media_type='show' AND (genre_category NOT LIKE '%Children%' OR genre_category IS NULL)
    GROUP BY genre_category 
    ORDER BY count(*) DESC 
    LIMIT 25
""")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]}")
