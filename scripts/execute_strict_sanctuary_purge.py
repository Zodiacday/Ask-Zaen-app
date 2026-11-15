import sqlite3
import json
import io
import sys
import os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("PRAGMA journal_mode = WAL")
c.execute("PRAGMA synchronous = NORMAL")

print("="*70)
print("EXECUTING STRICT SANCTUARY PURGE & CURATION")
print("="*70)

# Trusted Children's Hubs
TRUSTED_PUBLISHERS = {
    'pbs', 'pbs kids', 'cbeebies', 'cbbc', 'sesame workshop', 'scholastic',
    'tvokids', 'treehouse', 'treehouse direct', 'ytv', 'wildbrain', 'family channel',
    'family jr.', 'citv', 'kika', 'svt barnkanalen', 'svt barn', 'nrk super', 'abc kids',
    'nickelodeon', 'nick jr.', 'disney junior', 'disney channel animation', 
    'disney channel', 'disney+', 'disneynow',
    
    # Music & Audio
    'super simple songs', 'super simple songs - kids songs', 'the wiggles', 
    'sesame street', 'cocomelon', 'cocomelon - nursery rhymes',
    'kno music', 'halidonmusic', 'songs of birdland', 'sleep sounds 4k - hdr',
    'baby relax channel', 'lullaby baby', 'meditarsons in english', 'little dream nest',
    'kidzen', 'jason soothing sleep melodies、他 2 チャンネル', 'black screen music',
    'kidz bop', 'kidz bop kids', 'disneymusicvevo', 'walt disney records', 'disney music',
    'the hit crew - topic', 'just kids - topic', 'mood melodies',
    
    # Nature & Drawing Discovery
    'nat geo kids', 'art for kids hub', 'crash course kids'
}

# Golden Sanctuary Titles (Whitelisted regardless of obscure network tags)
GOLDEN_TITLES = {
    'mister rogers\' neighborhood', 'mister rogers neighborhood', 'daniel tiger\'s neighborhood',
    'bluey', 'bluey book reads', 'bluey minisodes', 'trash truck', 'sarah & duck', 'tumble leaf', 
    'little bear', 'franklin', 'franklin and friends', 'kipper', 'pingu', 'pingu in the city', 
    'peppa pig', 'peppa pig tales', 'octonauts', 'octonauts: above & beyond', 'postman pat', 
    'in the night garden...', 'in the night garden', 'brambly hedge', 'thomas & friends', 
    'winnie the pooh', 'the new adventures of winnie the pooh', 'playdate with winnie the pooh',
    'me & winnie the pooh', 'bear in the big blue house', 'rolie polie olie', 'out of the box', 
    'pb&j otter', 'blue\'s clues', 'blue\'s clues & you!', 'dora the explorer', 'oswald', 
    'max & ruby', 'wonder pets', 'wonder pets!', 'the backyardigans', 'teletubbies',
    'bob the builder', 'charlie and lola', 'fireman sam', 'clifford the big red dog',
    'arthur', 'cyberchase', 'the magic school bus', 'the magic school bus rides again',
    'dragon tales', 'peg + cat', 'reading rainbow', 'wordworld', 'zoboomafoo', 'curious george',
    'caillou', 'toopy and binoo', 'the big comfy couch', 'timothy goes to school',
    'maggie and the ferocious beast', 'babar', 'rugrats', 'hey arnold!', 'lazytown',
    'veggietales', 'veggietales in the house', 'veggietales in the city', 'muppet babies', 
    'sesame street', 'shaun the sheep', 'little einsteins', 'mickey mouse clubhouse', 
    'sofia the first', 'bubble guppies', 'team umizoomi', 'pippi longstocking', 
    'sanzoku no musume ronja', 'ronja the robber\'s daughter', 'the wonderful adventures of nils', 
    'barbapapa', 'barbapapa around the world', 'hamtaro', 'miffy', 'miffy\'s adventures big and small',
    'the wiggles', 'numberblocks', 'alphablocks'
}

# Strict Blacklist: Combat anime, superhero fights, loud slapstick, tween sitcoms, adult talk shows
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
    'invader zim', 'danny phantom', 'xiaolin showdown', 'static shock', 'gargoyles',
    'senkveld med thomas og harald', 'king arthur and the knights of justice',
    "king arthur's disasters", 'oswaldo'
}

# 1. EVALUATE SHOWS
c.execute("SELECT id, title, creator_publisher, genre_category FROM kids_media WHERE media_type='show'")
shows = c.fetchall()

keep_show_ids = []
purge_show_ids = []

for s in shows:
    s_id, title, creator, genre = s
    t_lower = (title or '').strip().lower()
    c_lower = (creator or '').strip().lower()

    if any(ex in t_lower for ex in STRICT_EXCLUDE_TITLES):
        purge_show_ids.append(s_id)
        continue

    is_trusted = any(tp in c_lower for tp in TRUSTED_PUBLISHERS)
    is_golden = any(gt in t_lower for gt in GOLDEN_TITLES)

    if not is_trusted and not is_golden:
        purge_show_ids.append(s_id)
        continue

    if 'Romance' in (genre or '') or 'Crime' in (genre or '') or 'War' in (genre or ''):
        purge_show_ids.append(s_id)
        continue

    keep_show_ids.append(s_id)

print(f"1. SHOWS: Keeping {len(keep_show_ids):,} Sanctuary shows, Purging {len(purge_show_ids):,} shows.")

# 2. EVALUATE VIDEOS & MUSIC
c.execute("SELECT id, title, creator_publisher, media_type, stimulation_score, stimulation_label FROM kids_media WHERE media_type IN ('video', 'music')")
media_items = c.fetchall()

keep_media_ids = []
purge_media_ids = []

for m in media_items:
    m_id, title, creator, mtype, stim_score, stim_label = m
    t_lower = (title or '').strip().lower()
    c_lower = (creator or '').strip().lower()

    if any(ex in t_lower for ex in STRICT_EXCLUDE_TITLES):
        purge_media_ids.append(m_id)
        continue

    is_trusted = any(tp in c_lower for tp in TRUSTED_PUBLISHERS)
    is_golden = any(gt in t_lower for gt in GOLDEN_TITLES)

    if not is_trusted and not is_golden:
        purge_media_ids.append(m_id)
        continue

    if stim_label == 'high' or (stim_score is not None and stim_score > 65):
        purge_media_ids.append(m_id)
        continue

    keep_media_ids.append(m_id)

print(f"2. MEDIA: Keeping {len(keep_media_ids):,} Sanctuary videos/music, Purging {len(purge_media_ids):,} items.")

# 3. EXECUTE PURGES
print("\n3. Executing permanent deletions in SQLite...")

# Temporary table of purged shows
c.execute("CREATE TEMP TABLE purge_shows_temp (id INTEGER PRIMARY KEY)")
c.executemany("INSERT INTO purge_shows_temp VALUES (?)", [(sid,) for sid in purge_show_ids])

# A. Purge episodes of non-sanctuary shows
c.execute("DELETE FROM kids_media WHERE media_type='episode' AND parent_show_id IN (SELECT id FROM purge_shows_temp)")
episodes_deleted = c.rowcount
print(f"   [DONE] Deleted {episodes_deleted:,} non-sanctuary episodes.")

# B. Purge non-sanctuary shows
c.execute("DELETE FROM kids_media WHERE id IN (SELECT id FROM purge_shows_temp)")
shows_deleted = c.rowcount
print(f"   [DONE] Deleted {shows_deleted:,} non-sanctuary shows.")

# C. Purge non-sanctuary videos and music
c.execute("CREATE TEMP TABLE purge_media_temp (id INTEGER PRIMARY KEY)")
c.executemany("INSERT INTO purge_media_temp VALUES (?)", [(mid,) for mid in purge_media_ids])
c.execute("DELETE FROM kids_media WHERE id IN (SELECT id FROM purge_media_temp)")
media_deleted = c.rowcount
print(f"   [DONE] Deleted {media_deleted:,} non-sanctuary videos/music tracks.")

conn.commit()

c.execute("SELECT count(*) FROM kids_media")
final_total = c.fetchone()[0]
print(f"\nTotal Clean Sanctuary Records in database: {final_total:,}")

# Rebuild FTS
print("\n4. Rebuilding Full-Text Search index...")
try:
    c.execute("INSERT INTO kids_media_fts(kids_media_fts) VALUES('rebuild')")
    conn.commit()
    print("   [DONE] FTS search index rebuilt.")
except Exception as e:
    print(f"   [NOTE] FTS: {e}")

conn.close()

# VACUUM to shrink file size
print("\n5. VACUUMing database to shrink file size...")
vac_conn = sqlite3.connect(db_path)
vac_conn.execute("VACUUM")
vac_conn.close()

new_size_mb = os.path.getsize(db_path) / (1024 * 1024)
print(f"   [DONE] VACUUM completed. Clean DB size: {new_size_mb:.1f} MB.")
print("\n" + "="*70)
print("STRICT SANCTUARY PURGE & CURATION COMPLETED SUCCESSFULLY!")
print("="*70)
