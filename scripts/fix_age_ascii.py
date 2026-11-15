import sqlite3
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

target_db = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(target_db)
c = conn.cursor()

big_kids_ids = [2442, 2520, 21578, 2659, 2374, 21306, 2635, 2380, 2647, 2648, 26333, 2448]
tween_ids = [2412, 2414, 2413, 21237, 2425, 2401, 2382, 2426, 2402, 21377, 21433, 21434]

c.execute(f"UPDATE kids_media SET target_age_group = '6-9' WHERE id IN ({','.join(['?']*len(big_kids_ids))}) OR parent_show_id IN ({','.join(['?']*len(big_kids_ids))})", big_kids_ids + big_kids_ids)
c.execute(f"UPDATE kids_media SET target_age_group = '8-12' WHERE id IN ({','.join(['?']*len(tween_ids))}) OR parent_show_id IN ({','.join(['?']*len(tween_ids))})", tween_ids + tween_ids)

conn.commit()
print("Updated age tags to ASCII '6-9' and '8-12'.")
