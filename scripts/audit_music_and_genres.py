import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("=== MUSIC CREATORS (Top 30) ===")
c.execute("SELECT creator_publisher, count(*) FROM kids_media WHERE media_type='music' GROUP BY creator_publisher ORDER BY count(*) DESC LIMIT 30")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== SAMPLE MUSIC TITLES ===")
c.execute("SELECT id, title, creator_publisher, genre_category, duration_seconds FROM kids_media WHERE media_type='music' LIMIT 25")
for r in c.fetchall():
    print(f"  [{r[0]}] {r[1]} | {r[2]} | {r[3]} | {r[4]}s")

print("\n=== UNPLAYABLE OR DEAD VIDEOS/MUSIC ===")
c.execute("SELECT media_type, count(*) FROM kids_media WHERE stimulation_label='unplayable' GROUP BY media_type")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== ADULT/SUSPECT GENRES IN SHOWS ===")
bad_genres = ['Romance', 'Crime', 'Thriller', 'Horror', 'War', 'Mystery', 'Legal', 'Medical', 'Western', 'Action']
for g in bad_genres:
    c.execute("SELECT count(*) FROM kids_media WHERE media_type='show' AND genre_category LIKE ?", (f'%{g}%',))
    cnt = c.fetchone()[0]
    print(f"  Shows with '{g}': {cnt}")

print("\n=== SHOWS WITH NO 'Children' GENRE ===")
c.execute("SELECT count(*) FROM kids_media WHERE media_type='show' AND genre_category NOT LIKE '%Children%'")
cnt_no_children = c.fetchone()[0]
print(f"  Shows where genre does NOT contain 'Children': {cnt_no_children} out of 5,535")
