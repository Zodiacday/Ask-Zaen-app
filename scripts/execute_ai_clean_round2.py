import sqlite3
import json
import io
import sys
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("PRAGMA journal_mode = WAL")
c.execute("PRAGMA synchronous = NORMAL")

print("="*70)
print("EXECUTING STAGE 2 AI SANITIZATION")
print("="*70)

adult_cable_nets = {
    'adult swim', 'vh1', 'bravo', 'comedy central', 'mtv', 'tv land', 'bounce', 
    'vice tv', 'a&e', 'cmt', 'sky showcase', 'dǒuyīn', 'weibo', 'facebook watch', 
    'igtv', 'rooster teeth', 'тнт', 'рен тв', 'пятница', 'нтв', '2+2', 'белсат tv',
    'game show network', 'outdoor channel', 'travel channel', 'food network', 'hgtv'
}

specific_unwanted_titles = {
    'teenage euthanasia', 'mr. neighbor\'s house', 'haha, you clowns', 'boys to manzo',
    'me and mrs. jones', 'cradle to grave', 'hogan knows best', 'horrible histories',
    'nightmare ned', 'grange hill', 'carters get rich', 'днк', 'няня оксана', '2gether',
    'instant mom', 'family time', 'terry pratchett\'s hogfather', 'abby\'s studio rescue',
    'abby\'s ultimate dance competition', 'degrassi: next class', 'workin\' moms',
    'the toxic crusaders', 'dragon ball z', 'yu-gi-oh!', 'totally spies!'
}

semantic_bad_patterns = [
    r'\bsex\b', r'\bsexual\b', r'\beuthanasia\b', r'\bmortuary\b', r'\bembalming\b',
    r'\bblood and gore\b', r'\btorture\b', r'\bmurderous\b', r'\bcorpse\b',
    r'\bdating app\b', r'\bpaternity\b', r'\bheroin\b', r'\bdrug addiction\b',
    r'\bknife crime\b', r'\bhaving sex\b', r'\bhooking up\b', r'\bprostitut'
]
semantic_bad_regex = re.compile('|'.join(semantic_bad_patterns), re.IGNORECASE)

# 1. Identify shows
c.execute("SELECT id, title, creator_publisher, genre_category, target_age_group, description FROM kids_media WHERE media_type='show'")
shows = c.fetchall()

purge_show_ids = []
for s in shows:
    s_id, title, net, genres, age, desc = s
    t_lower = (title or '').strip().lower()
    net_lower = (net or '').strip().lower()
    full_text = f"{t_lower} {desc or ''}"

    if t_lower in specific_unwanted_titles or net_lower in adult_cable_nets or semantic_bad_regex.search(full_text):
        purge_show_ids.append(s_id)

print(f"Purging {len(purge_show_ids)} shows...")

# Create temp table
c.execute("CREATE TEMP TABLE purge_shows_temp (id INTEGER PRIMARY KEY)")
c.executemany("INSERT INTO purge_shows_temp VALUES (?)", [(sid,) for sid in purge_show_ids])

# Index on parent_show_id
c.execute("CREATE INDEX IF NOT EXISTS idx_parent_show ON kids_media(parent_show_id)")

# 2. Delete episodes
c.execute("DELETE FROM kids_media WHERE media_type='episode' AND parent_show_id IN (SELECT id FROM purge_shows_temp)")
episodes_deleted = c.rowcount
print(f"Deleted {episodes_deleted:,} episodes.")

# 3. Delete shows
c.execute("DELETE FROM kids_media WHERE id IN (SELECT id FROM purge_shows_temp)")
shows_deleted = c.rowcount
print(f"Deleted {shows_deleted:,} shows.")

# 4. Delete bad videos/music
c.execute("SELECT id, title, creator_publisher FROM kids_media WHERE media_type IN ('video', 'music')")
media_items = c.fetchall()
purge_media_ids = []
bad_creators = {'bratz', 'retrofuntv'}

for m in media_items:
    m_id, title, creator = m
    c_lower = (creator or '').strip().lower()
    t_lower = (title or '').strip().lower()
    if c_lower in bad_creators or semantic_bad_regex.search(t_lower):
        purge_media_ids.append(m_id)

c.execute("CREATE TEMP TABLE purge_media_temp (id INTEGER PRIMARY KEY)")
c.executemany("INSERT INTO purge_media_temp VALUES (?)", [(mid,) for mid in purge_media_ids])
c.execute("DELETE FROM kids_media WHERE id IN (SELECT id FROM purge_media_temp)")
media_deleted = c.rowcount
print(f"Deleted {media_deleted:,} videos and music tracks.")

conn.commit()

c.execute("SELECT count(*) FROM kids_media")
final_count = c.fetchone()[0]
print(f"\nFinal clean database records: {final_count:,}")

# Rebuild FTS
try:
    c.execute("INSERT INTO kids_media_fts(kids_media_fts) VALUES('rebuild')")
    conn.commit()
    print("FTS index rebuilt.")
except Exception as e:
    print(f"FTS note: {e}")

conn.close()
print("Stage 2 sanitization completed successfully.")
