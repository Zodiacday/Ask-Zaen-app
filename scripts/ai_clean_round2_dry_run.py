import sqlite3
import json
import io
import sys
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("="*70)
print("STAGE 2 AI AUDIT & CLEANUP DRY-RUN")
print("="*70)

# Adult / Cable / Tabloid / Parody networks
adult_cable_nets = {
    'adult swim', 'vh1', 'bravo', 'comedy central', 'mtv', 'tv land', 'bounce', 
    'vice tv', 'a&e', 'cmt', 'sky showcase', 'dǒuyīn', 'weibo', 'facebook watch', 
    'igtv', 'rooster teeth', 'тнт', 'рен тв', 'пятница', 'нтв', '2+2', 'белсат tv',
    'game show network', 'outdoor channel', 'travel channel', 'food network', 'hgtv'
}

# Specific adult, teen, horror, or violent combat titles
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

c.execute("SELECT id, title, creator_publisher, genre_category, target_age_group, description FROM kids_media WHERE media_type='show'")
shows = c.fetchall()

shows_to_purge = []
for s in shows:
    s_id, title, net, genres, age, desc = s
    t_lower = (title or '').strip().lower()
    net_lower = (net or '').strip().lower()
    full_text = f"{t_lower} {desc or ''}"

    if t_lower in specific_unwanted_titles:
        shows_to_purge.append((s, "Specific unwanted blacklist"))
        continue

    if net_lower in adult_cable_nets:
        shows_to_purge.append((s, f"Adult/cable network: {net}"))
        continue

    m = semantic_bad_regex.search(full_text)
    if m:
        shows_to_purge.append((s, f"Semantic description red flag: {m.group(0)}"))
        continue

print(f"1. SHOWS TO PURGE: {len(shows_to_purge)} out of {len(shows)} shows")
for s, reason in shows_to_purge:
    print(f"   [{s[0]}] \"{s[1]}\" | {s[2]} | {s[3]} --> {reason}")

# Associated episodes
purge_show_ids = [s[0] for s, _ in shows_to_purge]
c.execute("CREATE TEMP TABLE IF NOT EXISTS purge_show_ids (id INTEGER PRIMARY KEY)")
c.execute("DELETE FROM purge_show_ids")
c.executemany("INSERT INTO purge_show_ids VALUES (?)", [(sid,) for sid in purge_show_ids])

c.execute("SELECT count(*) FROM kids_media WHERE media_type='episode' AND parent_show_id IN (SELECT id FROM purge_show_ids)")
episodes_to_purge = c.fetchone()[0]
print(f"\n2. ASSOCIATED EPISODES TO PURGE: {episodes_to_purge:,}")

# Videos & Music to purge (Bratz, RetroFunTV, etc.)
c.execute("SELECT id, title, creator_publisher, media_type FROM kids_media WHERE media_type IN ('video', 'music')")
media_items = c.fetchall()
media_to_purge = []
bad_creators = {'bratz', 'retrofuntv'}

for m in media_items:
    m_id, title, creator, mtype = m
    c_lower = (creator or '').strip().lower()
    t_lower = (title or '').strip().lower()

    if c_lower in bad_creators:
        media_to_purge.append((m, f"Bad creator: {creator}"))
        continue
    match = semantic_bad_regex.search(t_lower)
    if match:
        media_to_purge.append((m, f"Semantic red flag in title: {match.group(0)}"))

print(f"\n3. VIDEOS & MUSIC TO PURGE: {len(media_to_purge):,} out of {len(media_items):,}")
for m, reason in media_to_purge[:20]:
    print(f"   [{m[0]}] \"{m[1]}\" | {m[2]} --> {reason}")

total_records_to_purge = len(shows_to_purge) + episodes_to_purge + len(media_to_purge)
c.execute("SELECT count(*) FROM kids_media")
current_total = c.fetchone()[0]
final_remaining = current_total - total_records_to_purge

print("\n" + "="*70)
print(f"STAGE 2 SUMMARY:")
print(f"  Current Database Records: {current_total:,}")
print(f"  Stage 2 Records to Purge: {total_records_to_purge:,}")
print(f"  Final Clean Database Total: {final_remaining:,}")
print("="*70)
