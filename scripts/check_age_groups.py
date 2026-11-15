import sqlite3
conn = sqlite3.connect(r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db')
c = conn.cursor()
c.execute("SELECT target_age_group, stimulation_label, count(*) FROM kids_media WHERE media_type != 'episode' GROUP BY target_age_group, stimulation_label")
for r in c.fetchall():
    print(r)
