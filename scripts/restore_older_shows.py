import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

backup_db = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.backup.db'
target_db = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'

b_conn = sqlite3.connect(backup_db)
t_conn = sqlite3.connect(target_db)

b_cursor = b_conn.cursor()
t_cursor = t_conn.cursor()

# Specific Big Kids (Ages 6–9) Show IDs
big_kids_ids = [2442, 2520, 21578, 2659, 2374, 21306, 2635, 2380, 2647, 2648, 26333, 2448]

# Specific Tween Classics (Ages 8–12) Show IDs
tween_ids = [2412, 2414, 2413, 21237, 2425, 2401, 2382, 2426, 2402, 21377, 21433, 21434]

all_restore_ids = big_kids_ids + tween_ids

print("="*70)
print(f"RESTORING {len(all_restore_ids)} SPECIFIC CLASSIC SHOWS FROM BACKUP")
print("="*70)

# Fetch shows from backup
b_cursor.execute(f"SELECT * FROM kids_media WHERE id IN ({','.join(['?']*len(all_restore_ids))})", all_restore_ids)
shows = b_cursor.fetchall()
col_names = [col[0] for col in b_cursor.description]
target_age_idx = col_names.index('target_age_group')
id_idx = col_names.index('id')

print(f"Found {len(shows)} shows to restore.")

# Insert or replace shows into target DB with updated target_age_group
placeholders = ','.join(['?']*len(col_names))
for s in shows:
    s_list = list(s)
    s_id = s_list[id_idx]
    if s_id in big_kids_ids:
        s_list[target_age_idx] = '6–9'
    elif s_id in tween_ids:
        s_list[target_age_idx] = '8–12'

    t_cursor.execute(f"INSERT OR REPLACE INTO kids_media VALUES ({placeholders})", s_list)
    print(f"  Restored Show: [{s_id}] {s_list[1]} (Age: {s_list[target_age_idx]})")

# Restore associated episodes
print("\nRestoring associated episodes for these shows...")
b_cursor.execute(f"SELECT * FROM kids_media WHERE media_type='episode' AND parent_show_id IN ({','.join(['?']*len(all_restore_ids))})", all_restore_ids)
episodes = b_cursor.fetchall()
print(f"Found {len(episodes):,} associated episodes to restore.")

for ep in episodes:
    ep_list = list(ep)
    parent_id = ep_list[col_names.index('parent_show_id')]
    if parent_id in big_kids_ids:
        ep_list[target_age_idx] = '6–9'
    elif parent_id in tween_ids:
        ep_list[target_age_idx] = '8–12'
    t_cursor.execute(f"INSERT OR REPLACE INTO kids_media VALUES ({placeholders})", ep_list)

t_conn.commit()
print("Restoration committed successfully.")

t_cursor.execute("SELECT count(*) FROM kids_media")
print(f"Total records in clean database now: {t_cursor.fetchone()[0]:,}")

# Rebuild FTS index
print("\nRebuilding FTS search index...")
try:
    t_cursor.execute("INSERT INTO kids_media_fts(kids_media_fts) VALUES('rebuild')")
    t_conn.commit()
    print("FTS search index updated.")
except Exception as e:
    print(f"FTS rebuild note: {e}")

b_conn.close()
t_conn.close()
print("All shows restored with clean age tags!")
