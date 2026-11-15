import sqlite3
import os

db_paths = [
    r"C:\Users\natan\.gemini\antigravity-ide\scratch\netflix-expo\data\kids_media.db",
    r"C:\Users\natan\.gemini\antigravity-ide\scratch\kids_media_db\kids_media.db",
    r"C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db"
]

sql_view = """
CREATE VIEW IF NOT EXISTS browsable_media AS
SELECT * FROM kids_media
WHERE media_type != 'episode';
"""

for path in db_paths:
    if os.path.exists(path):
        conn = sqlite3.connect(path)
        c = conn.cursor()
        c.execute(sql_view)
        conn.commit()
        
        # Test count
        c.execute("SELECT COUNT(*) FROM browsable_media")
        count = c.fetchone()[0]
        
        c.execute("SELECT media_type, COUNT(*) FROM browsable_media GROUP BY media_type")
        types = c.fetchall()
        
        conn.close()
        print(f"Created/verified view in {os.path.basename(path)}: {count} browsable items {types}")
