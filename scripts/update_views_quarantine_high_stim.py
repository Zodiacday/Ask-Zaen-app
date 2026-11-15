import sqlite3
import os

db_paths = [
    r"C:\Users\natan\.gemini\antigravity-ide\scratch\netflix-expo\data\kids_media.db",
    r"C:\Users\natan\.gemini\antigravity-ide\scratch\kids_media_db\kids_media.db",
    r"C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db"
]

for path in db_paths:
    if os.path.exists(path):
        conn = sqlite3.connect(path)
        c = conn.cursor()
        
        # 1. Update browsable_media to strictly exclude episodes and high stim
        c.execute("DROP VIEW IF EXISTS browsable_media")
        c.execute("""
            CREATE VIEW browsable_media AS
            SELECT * FROM kids_media
            WHERE media_type != 'episode'
              AND (stimulation_label != 'high' OR stimulation_label IS NULL)
        """)
        
        # 2. Create isolated view for high stimulation items alone
        c.execute("DROP VIEW IF EXISTS high_stim_boundary")
        c.execute("""
            CREATE VIEW high_stim_boundary AS
            SELECT * FROM kids_media
            WHERE stimulation_label = 'high'
        """)
        
        conn.commit()
        
        # Verify counts
        c.execute("SELECT COUNT(*) FROM browsable_media")
        calm_count = c.fetchone()[0]
        
        c.execute("SELECT media_type, COUNT(*) FROM browsable_media GROUP BY media_type")
        types = c.fetchall()
        
        c.execute("SELECT COUNT(*) FROM high_stim_boundary")
        high_count = c.fetchone()[0]
        
        c.execute("SELECT media_type, COUNT(*) FROM high_stim_boundary GROUP BY media_type")
        high_types = c.fetchall()
        
        conn.close()
        print(f"Updated {os.path.basename(path)}:")
        print(f"  - browsable_media (calm/moderate, no episodes): {calm_count} items -> {types}")
        print(f"  - high_stim_boundary (isolated alone): {high_count} items -> {high_types}")
