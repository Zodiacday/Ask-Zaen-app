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
print("COMPREHENSIVE DATABASE FILTER DRY-RUN")
print("="*70)

# -------------------------------------------------------------
# 1. SHOWS FILTERING RULES
# -------------------------------------------------------------
# A show is removed if:
# - It is in the explicit adult title blacklist
# - OR has forbidden adult genres (Horror, Crime, Thriller, War, Romance, Legal, Medical, Erotic)
# - OR has NO 'Children' genre AND is from adult broadcast network / non-kids category

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

shows_to_remove = []
shows_to_keep = []

for s in all_shows:
    s_id, title, network, genres = s
    title_lower = (title or '').strip().lower()
    net_lower = (network or '').strip().lower()
    gen_str = genres or ''

    # Check 1: Explicit adult title
    if title_lower in explicit_adult_titles:
        shows_to_remove.append((s_id, title, "Explicit adult title"))
        continue

    # Check 2: Bad genre
    if any(bg.lower() in gen_str.lower() for bg in hard_bad_genres):
        shows_to_remove.append((s_id, title, f"Inappropriate genre: {gen_str}"))
        continue

    # Check 3: Missing 'Children' genre
    has_children = 'children' in gen_str.lower()
    is_kids_net = any(kn in net_lower for kn in kids_networks)
    is_adult_net = any(an in net_lower for an in adult_networks)

    if not has_children:
        if is_adult_net:
            shows_to_remove.append((s_id, title, f"Adult network without Children genre: {network} ({gen_str})"))
            continue
        if not is_kids_net and ('Drama' in gen_str or 'Food' in gen_str or 'Sports' in gen_str or 'History' in gen_str or 'News' in gen_str):
            shows_to_remove.append((s_id, title, f"Non-kids genre without Children genre: {gen_str}"))
            continue

    shows_to_keep.append(s)

print(f"\n1. SHOWS FILTERING:")
print(f"   Original shows: {len(all_shows):,}")
print(f"   Shows to remove: {len(shows_to_remove):,}")
print(f"   Shows remaining: {len(shows_to_keep):,}")

# -------------------------------------------------------------
# 2. EPISODES FILTERING
# -------------------------------------------------------------
# Remove episodes whose parent show is removed, or orphaned episodes
c.execute("CREATE TEMP TABLE IF NOT EXISTS keep_shows (id INTEGER PRIMARY KEY)")
c.execute("DELETE FROM keep_shows")
c.executemany("INSERT INTO keep_shows VALUES (?)", [(s[0],) for s in shows_to_keep])

c.execute("SELECT count(*) FROM kids_media WHERE media_type='episode'")
total_episodes = c.fetchone()[0]

c.execute("SELECT count(*) FROM kids_media WHERE media_type='episode' AND (parent_show_id NOT IN (SELECT id FROM keep_shows) OR parent_show_id IS NULL)")
episodes_to_remove = c.fetchone()[0]
episodes_to_keep = total_episodes - episodes_to_remove

print(f"\n2. EPISODES FILTERING:")
print(f"   Original episodes: {total_episodes:,}")
print(f"   Episodes to remove (belonging to removed adult/soap shows): {episodes_to_remove:,}")
print(f"   Episodes remaining: {episodes_to_keep:,}")

# -------------------------------------------------------------
# 3. VIDEOS & MUSIC FILTERING
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

c.execute("SELECT id, title, creator_publisher, media_type, stimulation_label FROM kids_media WHERE media_type='video'")
all_videos = c.fetchall()
videos_to_remove = []
videos_to_keep = []

for v in all_videos:
    v_id, title, creator, mtype, stim = v
    if stim == 'unplayable':
        videos_to_remove.append((v_id, title, "Unplayable / dead link"))
    elif bad_regex.search(title or ''):
        videos_to_remove.append((v_id, title, "Inappropriate / UGC junk keyword"))
    else:
        videos_to_keep.append(v)

print(f"\n3. VIDEOS FILTERING:")
print(f"   Original videos: {len(all_videos):,}")
print(f"   Videos to remove (unplayable + UGC junk): {len(videos_to_remove):,}")
print(f"   Videos remaining: {len(videos_to_keep):,}")

c.execute("SELECT id, title, creator_publisher, media_type, stimulation_label FROM kids_media WHERE media_type='music'")
all_music = c.fetchall()
music_to_remove = []
music_to_keep = []

for m in all_music:
    m_id, title, creator, mtype, stim = m
    if stim == 'unplayable':
        music_to_remove.append((m_id, title, "Unplayable / dead link"))
    elif bad_regex.search(title or ''):
        music_to_remove.append((m_id, title, "Inappropriate / UGC junk keyword"))
    else:
        music_to_keep.append(m)

print(f"\n4. MUSIC FILTERING:")
print(f"   Original music: {len(all_music):,}")
print(f"   Music tracks to remove: {len(music_to_remove):,}")
print(f"   Music tracks remaining: {len(music_to_keep):,}")

# -------------------------------------------------------------
# 5. SUMMARY TOTALS
# -------------------------------------------------------------
total_orig = len(all_shows) + total_episodes + len(all_videos) + len(all_music)
total_rem = len(shows_to_remove) + episodes_to_remove + len(videos_to_remove) + len(music_to_remove)
total_kept = len(shows_to_keep) + episodes_to_keep + len(videos_to_keep) + len(music_to_keep)

print(f"\n" + "="*70)
print(f"GRAND TOTALS:")
print(f"   Total Original Records: {total_orig:,}")
print(f"   Total Records to Purge: {total_rem:,} ({total_rem/total_orig*100:.1f}%)")
print(f"   Total Pristine Clean Records Remaining: {total_kept:,} ({total_kept/total_orig*100:.1f}%)")
print(f"="*70)
