import sqlite3
import io
import sys
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conn = sqlite3.connect(r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db')
c = conn.cursor()

print("SHOWS WITH SUSPECT OR MISALIGNED AGE TAGS:")
c.execute("""
    SELECT id, title, creator_publisher, target_age_group 
    FROM kids_media 
    WHERE media_type = 'show' 
      AND (
          (title IN ('100 Things to Do Before High School', '100 Deeds for Eddie McDowd', 'Aaahh!!! Real Monsters', '3 Friends and Jerry', 'All That', 'Deadtime Stories') AND target_age_group != '8-12')
          OR (creator_publisher = 'Nickelodeon' AND target_age_group = '3-8')
      )
""")
rows = c.fetchall()
print(f"Found {len(rows)} shows to inspect:")
for r in rows[:25]:
    print(f"  [{r[0]}] {r[1]} | Pub: {r[2]} | Age: {r[3]}")
