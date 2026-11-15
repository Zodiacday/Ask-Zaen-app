import sqlite3
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conn = sqlite3.connect(r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db')
c = conn.cursor()

c.execute("""
    SELECT id, title, creator_publisher, target_age_group 
    FROM kids_media 
    WHERE media_type='show' 
      AND (
          title IN ('Girl Meets World', 'K.C. Undercover', 'Phil of the Future', 'Sonny with a Chance', 
                    'Stuck in the Middle', 'Sydney to the Max', 'JONAS', 'Big Time Rush', 'Even Stevens', 
                    'Boy Meets World', 'Sister, Sister', 'Unfabulous', 'The Haunted Hathaways')
      )
""")
rows = c.fetchall()
print(f"Found {len(rows)} matching tween shows in DB:")
for r in rows:
    print(f"  [{r[0]}] {r[1]} | Pub: {r[2]} | Age: {r[3]}")
