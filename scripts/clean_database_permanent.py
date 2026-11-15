import sqlite3
import shutil
import os
import io
import sys
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
backup_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.backup.db'

print("="*70)
print("PERMANENT SANITIZATION OF 'kids_media.db'")
print("="*70)

# 1. Step 1: Backup if not already backed up
if not os.path.exists(backup_path):
    print(f"\n1. Creating safety backup at:\n   {backup_path}")
    shutil.copy2(db_path, backup_path)
    print("   [DONE] Safety backup created successfully.")
else:
    print(f"\n1. Safety backup already exists at:\n   {backup_path}")

# 2. Connect to database
conn = sqlite3.connect(db_path)
c = conn.cursor()

# Enable pragmas for speed
c.execute("PRAGMA journal_mode = WAL")
c.execute("PRAGMA synchronous = NORMAL")

# Total initial count
c.execute("SELECT count(*) FROM kids_media")
initial_total = c.fetchone()[0]
print(f"\n2. Initial total records in database: {initial_total:,}")

# -------------------------------------------------------------
# 3. IDENTIFY SHOWS TO PURGE
# -------------------------------------------------------------
kids_networks = {
    'cbeebies', 'cbbc', 'pbs', 'pbs kids', 'nickelodeon', 'nick jr.', 'nicktoons', 
    'disney channel', 'disney junior', 'disney xd', 'disney+', 'cartoon network', 
    'boomerang', 'treehouse', 'ytv', 'family channel', 'wildbrain', 'tvokids',
    'sesame workshop', 'scholastic', 'the wiggles', 'coastal', 'abc kids'
}

adult_networks = {
    'cbs', 'nbc', 'abc', 'fox', 'itv1', 'itv', 'lifetime', 'sundancetv', 'paramount+ with showtime',
    'showtime', 'hbo', 'bet', 'tnt', 'tlc', 'hallmark channel', 'freeform', 'the wb', 'the cw',
    'kbs1', 'kbs2', 'mbc', 'sbs', 'kanal d', 'atv', 'las estrellas', 'cctv-8', 'nine network',
    'seven network', 'audience network', 'syfy', 'usa network', 'amc', 'fx'
}

hard_bad_genres = ['Horror', 'Crime', 'Thriller', 'War', 'Romance', 'Legal', 'Medical', 'Erotic']

explicit_adult_titles = {
    'family guy', 'the simpsons', 'bob\'s burgers', 'american dad!', 'shameless', 
    'two and a half men', 'mom', 'bad judge', 'parenthood', 'modern family', 
    'the goldbergs', 'the middle', 'last man standing', 'downton abbey', 
    'days of our lives', 'the bold and the beautiful', 'dallas', 'army wives', 
    'the fosters', 'dancing with the stars', 'the amazing race', 'arrested development',
    'mike & molly', 'switched at birth', 'black-ish', 'everwood', 'one tree hill',
    'dharma & greg', 'brothers & sisters', 'my generation', 'kingdom', 'being mary jane',
    'courage the cowardly dog', 'young dracula', 'murderland', 'the red road',
    'franklin', 'masterchef junior'
}

c.execute("SELECT id, title, creator_publisher, genre_category FROM kids_media WHERE media_type='show'")
all_shows = c.fetchall()

shows_to_remove = set()
for s in all_shows:
    s_id, title, network, genres = s
    title_lower = (title or '').strip().lower()
    net_lower = (network or '').strip().lower()
    gen_str = genres or ''

    # Rule A: Explicit adult title blacklist
    if title_lower in explicit_adult_titles:
        shows_to_remove.add(s_id)
        continue

    # Rule B: Inappropriate genres
    if any(bg.lower() in gen_str.lower() for bg in hard_bad_genres):
        shows_to_remove.add(s_id)
        continue

    # Rule C: Missing 'Children' genre on non-kids networks / adult categories
    has_children = 'children' in gen_str.lower()
    is_kids_net = any(kn in net_lower for kn in kids_networks)
    is_adult_net = any(an in net_lower for an in adult_networks)

    if not has_children:
        if is_adult_net:
            shows_to_remove.add(s_id)
            continue
        if not is_kids_net and ('Drama' in gen_str or 'Food' in gen_str or 'Sports' in gen_str or 'History' in gen_str or 'News' in gen_str):
            shows_to_remove.add(s_id)
            continue

print(f"3. Shows identified for purging: {len(shows_to_remove):,} (out of {len(all_shows):,})")

# -------------------------------------------------------------
# 4. IDENTIFY VIDEOS & MUSIC TO PURGE
# -------------------------------------------------------------
bad_patterns = [
    r'\bdeath\b', r'\bdead(?!\s+adder|\s+of the dead)\b', r'\bdies?\b', r'\bkills?\b', r'\bkiller\b', r'\bmurder\b',
    r'\bblood\b', r'\bhorror\b', r'\bcreepy(?! crawly)\b', r'\bcreepypasta\b',
    r'\bscary(?! villains| stories)\b', r'\bcursed\b', r'\b\.exe\b', r'\bdemon\b', r'\bdevil\b',
    r'\bsuicide\b', r'\bgore\b', r'\bweapons?\b',
    r'\bskibidi\b', r'\bhuggy\b', r'\bpoppy playtime\b', r'\bfnf\b', r'\bfriday night funkin\b',
    r'\bgta\b', r'\bgrand theft auto\b', r'\bamong us\b', r'\broblox\b',
    r'\bplaythrough\b', r'\bwalkthrough\b', r'\bgameplay\b', r'\bspeedrun\b', r'\bno death\b',
    r'#shorts\b', r'\b#short\b', r'\btiktok\b', r'\bprank\b', r'\bexposed\b', r'\breaction\b',
    r'\bfull vhs\b', r'\bvhs rip\b', r'\bbanned\b', r'\blast episode\b', r'\bglitch\b'
]
bad_regex = re.compile('|'.join(bad_patterns), re.IGNORECASE)

c.execute("SELECT id, title, creator_publisher, media_type, stimulation_label FROM kids_media WHERE media_type IN ('video', 'music')")
ugc_items = c.fetchall()

ugc_to_remove = set()
for item in ugc_items:
    m_id, title, creator, mtype, stim = item
    if stim == 'unplayable':
        ugc_to_remove.add(m_id)
    elif bad_regex.search(title or ''):
        ugc_to_remove.add(m_id)

print(f"4. Videos & Music identified for purging: {len(ugc_to_remove):,} (out of {len(ugc_items):,})")

# -------------------------------------------------------------
# 5. EXECUTE THE PURGE
# -------------------------------------------------------------
print("\n5. Executing database purges...")

# Create temp table for show IDs to remove
c.execute("CREATE TEMP TABLE remove_shows (id INTEGER PRIMARY KEY)")
c.executemany("INSERT INTO remove_shows VALUES (?)", [(sid,) for sid in shows_to_remove])

# Create temp table for UGC IDs to remove
c.execute("CREATE TEMP TABLE remove_ugc (id INTEGER PRIMARY KEY)")
c.executemany("INSERT INTO remove_ugc VALUES (?)", [(uid,) for uid in ugc_to_remove])

# Index on parent_show_id to make episode deletions instantaneous
c.execute("CREATE INDEX IF NOT EXISTS idx_parent_show ON kids_media(parent_show_id)")

# A. Purge episodes of removed shows
c.execute("""
    DELETE FROM kids_media 
    WHERE media_type='episode' AND (parent_show_id IN (SELECT id FROM remove_shows) OR parent_show_id IS NULL)
""")
episodes_deleted = c.rowcount
print(f"   [DONE] Deleted {episodes_deleted:,} episodes belonging to adult/soap/inappropriate shows.")

# B. Purge shows
c.execute("DELETE FROM kids_media WHERE id IN (SELECT id FROM remove_shows)")
shows_deleted = c.rowcount
print(f"   [DONE] Deleted {shows_deleted:,} adult/soap/inappropriate shows.")

# C. Purge weird/dead videos and music
c.execute("DELETE FROM kids_media WHERE id IN (SELECT id FROM remove_ugc)")
ugc_deleted = c.rowcount
print(f"   [DONE] Deleted {ugc_deleted:,} dead/unplayable/brainrot video and music records.")

# Commit changes
conn.commit()

# Total remaining
c.execute("SELECT count(*) FROM kids_media")
final_total = c.fetchone()[0]
total_purged = initial_total - final_total
print(f"\n   Total records purged: {total_purged:,}")
print(f"   Remaining clean records: {final_total:,}")

# -------------------------------------------------------------
# 6. REBUILD FTS INDEX & VACUUM
# -------------------------------------------------------------
print("\n6. Rebuilding FTS search index...")
try:
    c.execute("INSERT INTO kids_media_fts(kids_media_fts) VALUES('rebuild')")
    conn.commit()
    print("   [DONE] FTS search index rebuilt successfully.")
except Exception as e:
    print(f"   [NOTE] FTS rebuild note: {e}")

print("\n7. VACUUMing database to reclaim disk space...")
conn.close()

# Reconnect outside transaction to vacuum
vac_conn = sqlite3.connect(db_path)
vac_conn.execute("VACUUM")
vac_conn.close()

new_size_mb = os.path.getsize(db_path) / (1024 * 1024)
backup_size_mb = os.path.getsize(backup_path) / (1024 * 1024)
print(f"   [DONE] VACUUM completed.")
print(f"   Original DB size: {backup_size_mb:.1f} MB")
print(f"   Cleaned DB size:  {new_size_mb:.1f} MB (Reclaimed {backup_size_mb - new_size_mb:.1f} MB!)")
print("\n" + "="*70)
print("DATABASE SANITIZATION FULLY COMPLETED!")
print("="*70)
