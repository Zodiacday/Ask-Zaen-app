import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT id, title, creator_publisher, genre_category FROM kids_media WHERE media_type='show'")
shows = c.fetchall()

# Kids networks whitelist
kids_networks = {
    'cbeebies', 'cbbc', 'pbs', 'pbs kids', 'nickelodeon', 'nick jr.', 'nicktoons', 
    'disney channel', 'disney junior', 'disney xd', 'disney+', 'cartoon network', 
    'boomerang', 'treehouse', 'ytv', 'family channel', 'wildbrain', 'tvokids',
    'sesame workshop', 'scholastic', 'the wiggles', 'coastal', 'abc kids'
}

# Adult / Soap / Reality networks
adult_networks = {
    'cbs', 'nbc', 'abc', 'fox', 'itv1', 'itv', 'lifetime', 'sundancetv', 'paramount+ with showtime',
    'showtime', 'hbo', 'bet', 'tnt', 'tlc', 'hallmark channel', 'freeform', 'the wb', 'the cw',
    'kbs1', 'kbs2', 'mbc', 'sbs', 'kanal d', 'atv', 'las estrellas', 'cctv-8', 'nine network',
    'seven network', 'audience network'
}

# Inappropriate genres (unconditionally exclude unless overridden)
hard_bad_genres = ['Horror', 'Crime', 'Thriller', 'War', 'Romance', 'Legal', 'Medical', 'Erotic']

# Specific inappropriate titles
explicit_adult_titles = {
    'family guy', 'the simpsons', 'bob\'s burgers', 'american dad!', 'shameless', 
    'two and a half men', 'mom', 'bad judge', 'parenthood', 'modern family', 
    'the goldbergs', 'the middle', 'last man standing', 'downton abbey', 
    'days of our lives', 'the bold and the beautiful', 'dallas', 'army wives', 
    'the fosters', 'dancing with the stars', 'the amazing race', 'arrested development',
    'mike & Molly', 'switched at birth', 'black-ish', 'everwood', 'one tree hill',
    'dharma & greg', 'brothers & sisters', 'my generation', 'kingdom', 'being mary jane',
    'courage the cowardly dog', 'young dracula', 'murderland', 'the red road',
    'franklin', 'masterchef junior'
}

filtered_out = []
kept_shows = []

for s in shows:
    s_id, title, network, genres = s
    title_lower = (title or '').strip().lower()
    net_lower = (network or '').strip().lower()
    gen_str = genres or ''

    # Check 1: Explicit adult title blacklist
    if title_lower in explicit_adult_titles:
        filtered_out.append((s, "Explicit adult title"))
        continue

    # Check 2: Contains hard bad genre (Horror, Crime, Romance, Thriller, etc.)
    has_bad_genre = any(bg.lower() in gen_str.lower() for bg in hard_bad_genres)
    if has_bad_genre:
        filtered_out.append((s, f"Bad genre: {gen_str}"))
        continue

    # Check 3: Show has NO 'Children' genre tag
    has_children_genre = 'children' in gen_str.lower()
    
    # If it has no children tag, is it on a recognized kids network?
    is_kids_net = any(kn in net_lower for kn in kids_networks)
    is_adult_net = any(an in net_lower for an in adult_networks)

    if not has_children_genre:
        if is_adult_net:
            filtered_out.append((s, f"Adult network without children tag: {network} ({gen_str})"))
            continue
        elif not is_kids_net and ('Drama' in gen_str or 'Food' in gen_str or 'Sports' in gen_str or 'History' in gen_str):
            filtered_out.append((s, f"Non-kids genre without children tag: {gen_str}"))
            continue

    kept_shows.append(s)

print(f"Total shows evaluated: {len(shows)}")
print(f"Shows kept: {len(kept_shows)}")
print(f"Shows filtered out: {len(filtered_out)}")

print("\nSample filtered out shows (first 30):")
for s, reason in filtered_out[:30]:
    print(f"  [{s[0]}] \"{s[1]}\" | {s[2]} | {s[3]} --> {reason}")

print("\nSample KEPT shows (first 30):")
for s in kept_shows[:30]:
    print(f"  [{s[0]}] \"{s[1]}\" | {s[2]} | {s[3]}")
