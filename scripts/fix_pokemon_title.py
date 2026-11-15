import sqlite3
import json

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("UPDATE kids_media SET title = 'Pokémon' WHERE id = 2442")
c.execute("UPDATE kids_media SET title = 'Pokémon' WHERE media_type='show' AND (title LIKE 'Pok%mon' OR title LIKE 'Pokmon')")
conn.commit()
print("Updated Pokemon title in DB.")

# Re-run export_data.py to refresh bundled_kids_media.json
conn.close()
