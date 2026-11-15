import sqlite3
import json
import re

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT COUNT(*) FROM kids_media")
total = c.fetchone()[0]
print(f"Total rows in db: {total}")

c.execute("SELECT media_type, COUNT(*) FROM kids_media GROUP BY media_type")
print("\nBreakdown by media_type:")
for row in c.fetchall():
    print(f"  {row[0]}: {row[1]}")

c.execute("SELECT stimulation_label, COUNT(*) FROM kids_media GROUP BY stimulation_label")
print("\nBreakdown by stimulation_label:")
for row in c.fetchall():
    print(f"  {row[0]}: {row[1]}")

# Let's inspect shows
c.execute("SELECT COUNT(*) FROM kids_media WHERE media_type = 'show'")
print(f"\nTotal shows: {c.fetchone()[0]}")

# Let's see some weird shows
c.execute("SELECT id, title, creator_publisher, genre_category, stimulation_label, target_age_group FROM kids_media WHERE media_type = 'show' LIMIT 25")
print("\nSample shows:")
for r in c.fetchall():
    print(f"  [{r[0]}] {r[1]} | {r[2]} | {r[3]} | {r[4]} | {r[5]}")
