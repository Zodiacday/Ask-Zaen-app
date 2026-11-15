import sqlite3
import json
import io
import sys
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

# Run the same logic as test_show_filter.py
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
shows = c.fetchall()

kept = []
for s in shows:
    s_id, title, network, genres = s
    title_lower = (title or '').strip().lower()
    net_lower = (network or '').strip().lower()
    gen_str = genres or ''

    if title_lower in explicit_adult_titles:
        continue
    if any(bg.lower() in gen_str.lower() for bg in hard_bad_genres):
        continue
    
    has_children = 'children' in gen_str.lower()
    is_kids_net = any(kn in net_lower for kn in kids_networks)
    is_adult_net = any(an in net_lower for an in adult_networks)

    if not has_children:
        if is_adult_net:
            continue
        if not is_kids_net and ('Drama' in gen_str or 'Food' in gen_str or 'Sports' in gen_str or 'History' in gen_str):
            continue

    kept.append(s)

print(f"Total kept shows: {len(kept)}")
net_counts = Counter(s[2] for s in kept)
print("\nTop 25 networks in KEPT shows:")
for net, cnt in net_counts.most_common(25):
    print(f"  {net}: {cnt}")

gen_counts = Counter(s[3] for s in kept)
print("\nTop 25 genres in KEPT shows:")
for gen, cnt in gen_counts.most_common(25):
    print(f"  {gen}: {cnt}")
