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
print("FULL SPECTRUM AI AUDIT: REMAINING 245,971 RECORDS")
print("="*70)

# 1. Adult Networks / Cable / Social Media Scrapings
adult_cable_nets = {
    'adult swim', 'vh1', 'bravo', 'comedy central', 'mtv', 'tv land', 'bounce', 
    'vice tv', 'a&e', 'cmt', 'sky showcase', 'dǒuyīn', 'weibo', 'facebook watch', 
    'igtv', 'rooster teeth', 'тнт', 'рен тв', 'пятница', 'нтв', '2+2', 'белсат tv',
    'game show network', 'outdoor channel', 'travel channel', 'food network', 'hgtv'
}

# 2. Semantic Red Flags in Descriptions
# We specifically look for adult themes, sexual content, gore/torture, funeral/euthanasia
semantic_bad_patterns = [
    r'\bsex\b', r'\bsexual\b', r'\beuthanasia\b', r'\bmortuary\b', r'\bembalming\b',
    r'\bblood and gore\b', r'\btorture\b', r'\bmurderous\b', r'\bcorpse\b',
    r'\bdating app\b', r'\bpaternity\b', r'\bheroin\b', r'\bdrug addiction\b',
    r'\bknife crime\b', r'\bhaving sex\b', r'\bhooking up\b', r'\bprostitut'
]
semantic_bad_regex = re.compile('|'.join(semantic_bad_patterns), re.IGNORECASE)

# 3. Explicit Titles that are teen/adult/horror
bad_specific_titles = {
    'teenage euthanasia', 'mr. neighbor\'s house', 'haha, you clowns', 'boys to manzo',
    'me and mrs. jones', 'cradle to grave', 'hogan knows best', 'horrible histories',
    'nightmare ned', 'grange hill', 'carters get rich', 'днк', 'няня оксана', '2gether',
    'instant mom', 'family time', 'terry pratchett\'s hogfather', 'abby\'s studio rescue',
    'abby\'s ultimate dance competition'
}

c.execute("SELECT id, title, creator_publisher, genre_category, target_age_group, description FROM kids_media WHERE media_type='show'")
shows = c.fetchall()

flagged_shows = []
for s in shows:
    s_id, title, net, genres, age, desc = s
    t_lower = (title or '').strip().lower()
    net_lower = (net or '').strip().lower()
    full_text = f"{t_lower} {desc or ''}"

    if t_lower in bad_specific_titles:
        flagged_shows.append((s, "Specific adult/horror blacklist match"))
        continue

    if net_lower in adult_cable_nets:
        flagged_shows.append((s, f"Adult/cable/social network: {net}"))
        continue

    m = semantic_bad_regex.search(full_text)
    if m:
        flagged_shows.append((s, f"Semantic red flag in description: '{m.group(0)}'"))
        continue

print(f"1. SHOWS AUDIT: Flagged {len(flagged_shows)} out of {len(shows)} shows:")
for s, reason in flagged_shows:
    print(f"   [{s[0]}] \"{s[1]}\" | {s[2]} | {s[3]} --> {reason}")

# 4. VIDEOS & MUSIC AUDIT:
# Look for Bratz, RetroFunTV, uncurated combat clips, and remaining high-stimulation junk
c.execute("SELECT id, title, creator_publisher, media_type, stimulation_score, stimulation_label FROM kids_media WHERE media_type IN ('video', 'music')")
items = c.fetchall()

flagged_media = []
bad_creators = {'bratz', 'retrofuntv'}

for item in items:
    m_id, title, creator, mtype, stim_score, stim_label = item
    c_lower = (creator or '').strip().lower()
    t_lower = (title or '').strip().lower()

    if c_lower in bad_creators:
        flagged_media.append((item, f"Bad creator: {creator}"))
        continue

    # Semantic check on video/music titles
    m = semantic_bad_regex.search(t_lower)
    if m:
        flagged_media.append((item, f"Semantic red flag in title: '{m.group(0)}'"))

print(f"\n2. VIDEOS & MUSIC AUDIT: Flagged {len(flagged_media)} out of {len(items)} media items:")
for item, reason in flagged_media[:30]:
    print(f"   [{item[0]}] \"{item[1]}\" | {item[2]} | {item[3]} --> {reason}")
