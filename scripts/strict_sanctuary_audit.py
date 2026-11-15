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
print("STRICT SANCTUARY AUDIT & CURATION PLAN")
print("="*70)

# Whitelist of Trusted Children's Hubs and Literary Classics
TRUSTED_PUBLISHERS = {
    # Public & Educational Hubs
    'pbs', 'pbs kids', 'cbeebies', 'cbbc', 'sesame workshop', 'scholastic',
    'tvokids', 'treehouse', 'treehouse direct', 'ytv', 'wildbrain', 'family channel',
    'family jr.', 'citv', 'kika', 'svt barnkanalen', 'svt barn', 'nrk super', 'abc kids',
    
    # Major Dedicated Preschool Channels
    'nickelodeon', 'nick jr.', 'disney junior', 'disney channel animation', 
    'disney channel', 'disney+', 'disneynow',
    
    # Verified Music & Lullaby Creators
    'super simple songs', 'super simple songs - kids songs', 'the wiggles', 
    'sesame street', 'cocomelon', 'cocomelon - nursery rhymes',
    'kno music', 'halidonmusic', 'songs of birdland', 'sleep sounds 4k - hdr',
    'baby relax channel', 'lullaby baby', 'meditarsons in english', 'little dream nest',
    'kidzen', 'jason soothing sleep melodies、他 2 チャンネル', 'black screen music',
    'kidz bop', 'kidz bop kids', 'disneymusicvevo', 'walt disney records', 'disney music',
    'the hit crew - topic', 'just kids - topic', 'mood melodies',
    
    # Verified Gentle Discovery
    'nat geo kids', 'art for kids hub', 'crash course kids'
}

# Whitelist of Golden Classic Preschool / Gentle Titles
GOLDEN_TITLES = {
    # Gentle Sanctuary Shows
    'mister rogers\' neighborhood', 'mister rogers neighborhood', 'daniel tiger\'s neighborhood',
    'bluey', 'trash truck', 'sarah & duck', 'tumble leaf', 'little bear', 'franklin',
    'pingu', 'kipper', 'peppa pig', 'octonauts', 'postman pat', 'in the night garden',
    'brambly hedge', 'thomas & friends', 'thomas the tank engine', 'winnie the pooh',
    'the new adventures of winnie the pooh', 'bear in the big blue house', 'rolie polie olie',
    'out of the box', 'pb&j otter', 'blue\'s clues', 'blue\'s clues & you!', 'dora the explorer',
    'oswald', 'max & ruby', 'wonder pets', 'wonder pets!', 'the backyardigans', 'teletubbies',
    'bob the builder', 'charlie and lola', 'fireman sam', 'noddy', 'clippers the big red dog',
    'clifford the big red dog', 'arthur', 'cyberchase', 'the magic school bus', 'dragon tales',
    'peg + cat', 'reading rainbow', 'wordworld', 'zoboomafoo', 'curious george',
    'caillou', 'toopy and binoo', 'the big comfy couch', 'timothy goes to school',
    'maggie and the ferocious beast', 'babar', 'rugrats', 'hey arnold!', 'lazytown',
    'veggietales', 'muppet babies', 'sesame street', 'shaun the sheep', 'little einsteins',
    'mickey mouse clubhouse', 'sofia the first', 'bubble guppies', 'team umizoomi',
    'pippi longstocking', 'sanzoku no musume ronja', 'ronja the robber\'s daughter',
    'the wonderful adventures of nils', 'barbapapa', 'barbapapa around the world',
    'hamtaro', 'miffy', 'miffy\'s adventures big and small', 'pob\'s programme'
}

# Explicit Exclusion Blacklist (Combat Anime, Superhero Battles, Teen Sitcoms, Tween Drama)
STRICT_EXCLUDE_TITLES = {
    'dragon ball z', 'dragon ball', 'naruto', 'bleach', 'one piece', 'yu-gi-oh!',
    'digimon', 'digimon adventure:', 'digimon universe: appli monsters',
    'pokemon', 'pokémon', 'transformers', 'power rangers', 'g.i. joe', 'beyblade',
    'bakugan', 'teen titans', 'teen titans go!', 'justice league', 'justice league unlimited',
    'batman', 'batman: the animated series', 'superman', 'x-men', 'x-men: evolution',
    'spider-man', 'star wars: clone wars', 'totally spies!', 'bratz', 'kim possible',
    'drake & josh', 'zoey 101', 'wizards of waverly place', 'hannah montana',
    'lizzie mcguire', 'icarly', 'victorious', 'big time rush', 'good luck charlie',
    'shake it up', 'austin & ally', 'liv & maddie', 'jessie', 'bunk\'d',
    'the suite life of zack and cody', 'the suite life on deck', 'that\'s so raven',
    'ned\'s declassified school survival guide', 'saved by the bell', 'degrassi',
    'henry danger', 'the thundermans', 'lab rats', 'mighty med', 'kickin\' it',
    'ben 10', 'ben 10: alien force', 'generator rex', 'samurai jack',
    'star vs. the forces of evil', 'gravity falls', 'adventure time', 'regular show',
    'the powerpuff girls', 'dexter\'s laboratory', 'ed, edd n\' eddy', 'johnny bravo',
    'invader zim', 'danny phantom', 'xiaolin showdown', 'static shock', 'gargoyles'
}

# Check all shows
c.execute("SELECT id, title, creator_publisher, genre_category, target_age_group, description FROM kids_media WHERE media_type='show'")
all_shows = c.fetchall()

sanctuary_shows = []
excluded_shows = []

for s in all_shows:
    s_id, title, creator, genre, age, desc = s
    t_lower = (title or '').strip().lower()
    c_lower = (creator or '').strip().lower()

    # Rule 1: Exclude if explicitly in combat/teen/overstimulating blacklist
    if any(ex in t_lower for ex in STRICT_EXCLUDE_TITLES):
        excluded_shows.append((s, "Combat/Teen/Overstimulating blacklist"))
        continue

    # Rule 2: Exclude if creator is not in trusted publishers AND title not in golden titles
    is_trusted_publisher = any(tp in c_lower for tp in TRUSTED_PUBLISHERS)
    is_golden_title = any(gt in t_lower for gt in GOLDEN_TITLES)

    if not is_trusted_publisher and not is_golden_title:
        excluded_shows.append((s, f"Untrusted network/creator: {creator}"))
        continue

    # Rule 3: Must be preschool/elementary friendly (no teen/high-school/romance)
    if 'Romance' in (genre or '') or 'Crime' in (genre or '') or 'War' in (genre or ''):
        excluded_shows.append((s, f"Inappropriate genre: {genre}"))
        continue

    sanctuary_shows.append(s)

print(f"Total current shows: {len(all_shows):,}")
print(f"Sanctuary shows kept: {len(sanctuary_shows):,}")
print(f"Excluded shows to purge: {len(excluded_shows):,}")

# Check episodes belonging to excluded shows
c.execute("CREATE TEMP TABLE IF NOT EXISTS keep_sanctuary_shows (id INTEGER PRIMARY KEY)")
c.execute("DELETE FROM keep_sanctuary_shows")
c.executemany("INSERT INTO keep_sanctuary_shows VALUES (?)", [(s[0],) for s in sanctuary_shows])

c.execute("SELECT count(*) FROM kids_media WHERE media_type='episode' AND parent_show_id NOT IN (SELECT id FROM keep_sanctuary_shows)")
episodes_to_purge = c.fetchone()[0]

c.execute("SELECT count(*) FROM kids_media WHERE media_type='episode' AND parent_show_id IN (SELECT id FROM keep_sanctuary_shows)")
episodes_kept = c.fetchone()[0]

print(f"\nEpisodes kept (belonging to Sanctuary shows): {episodes_kept:,}")
print(f"Episodes to purge: {episodes_to_purge:,}")

# Videos and Music check
c.execute("SELECT id, title, creator_publisher, media_type, stimulation_score, stimulation_label FROM kids_media WHERE media_type IN ('video', 'music')")
all_media = c.fetchall()

sanctuary_media = []
excluded_media = []

for m in all_media:
    m_id, title, creator, mtype, stim_score, stim_label = m
    t_lower = (title or '').strip().lower()
    c_lower = (creator or '').strip().lower()

    # Rule 1: Exclude if title in strict blacklist
    if any(ex in t_lower for ex in STRICT_EXCLUDE_TITLES):
        excluded_media.append((m, "Strict blacklist match"))
        continue

    # Rule 2: Must be from trusted publisher OR golden title
    is_trusted_publisher = any(tp in c_lower for tp in TRUSTED_PUBLISHERS)
    is_golden_title = any(gt in t_lower for gt in GOLDEN_TITLES)

    if not is_trusted_publisher and not is_golden_title:
        excluded_media.append((m, f"Untrusted creator: {creator}"))
        continue

    # Rule 3: Exclude high stimulation
    if stim_label == 'high' or (stim_score is not None and stim_score > 65):
        # Allow high stimulation only if strictly in bad category, but in sanctuary app, exclude by default
        excluded_media.append((m, f"High stimulation score: {stim_score}"))
        continue

    sanctuary_media.append(m)

print(f"\nTotal videos/music: {len(all_media):,}")
print(f"Sanctuary videos/music kept: {len(sanctuary_media):,}")
print(f"Excluded videos/music to purge: {len(excluded_media):,}")

total_clean_records = len(sanctuary_shows) + episodes_kept + len(sanctuary_media)
print("\n" + "="*70)
print(f"FINAL SANCTUARY CATALOG PROJECTION:")
print(f"  Sanctuary Shows:        {len(sanctuary_shows):,}")
print(f"  Sanctuary Episodes:     {episodes_kept:,}")
print(f"  Sanctuary Videos/Audio: {len(sanctuary_media):,}")
print(f"  Total Pristine Records: {total_clean_records:,}")
print("="*70)
