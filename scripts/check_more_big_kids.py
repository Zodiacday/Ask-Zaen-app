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
          title IN ('SpongeBob SquarePants', 'Phineas and Ferb', 'The Fairly OddParents', 'Danny Phantom', 
                    'My Life as a Teenage Robot', 'Kim Possible', 'The Proud Family', 'TaleSpin', 'Darkwing Duck', 
                    'DuckTales', 'Gargoyles', 'Cyberchase', 'Dragon Ball Z', 'Yu-Gi-Oh!', 'Power Rangers', 'Transformers')
      )
""")
rows = c.fetchall()
print(f"Found {len(rows)} matching classic action/adventure shows in DB:")
for r in rows:
    print(f"  [{r[0]}] {r[1]} | Pub: {r[2]} | Age: {r[3]}")
