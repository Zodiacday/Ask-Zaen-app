import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

TRUSTED_PUBLISHERS = {
    'pbs', 'pbs kids', 'cbeebies', 'cbbc', 'sesame workshop', 'scholastic',
    'tvokids', 'treehouse', 'treehouse direct', 'ytv', 'wildbrain', 'family channel',
    'family jr.', 'citv', 'kika', 'svt barnkanalen', 'svt barn', 'nrk super', 'abc kids',
    'nickelodeon', 'nick jr.', 'disney junior', 'disney channel animation', 
    'disney channel', 'disney+', 'disneynow'
}

GOLDEN_TITLES = {
    'mister rogers\' neighborhood', 'mister rogers neighborhood', 'daniel tiger\'s neighborhood',
    'bluey', 'trash truck', 'sarah & duck', 'tumble leaf', 'little bear', 'franklin',
    'pingu', 'kipper', 'peppa pig', 'octonauts', 'postman pat', 'in the night garden',
    'brambly hedge', 'thomas & friends', 'thomas the tank engine', 'winnie the pooh',
    'the new adventures of winnie the pooh', 'bear in the big blue house', 'rolie polie olie',
    'out of the box', 'pb&j otter', 'blue\'s clues', 'blue\'s clues & you!', 'dora the explorer',
    'oswald', 'max & ruby', 'wonder pets', 'wonder pets!', 'the backyardigans', 'teletubbies',
    'bob the builder', 'charlie and lola', 'fireman sam', 'noddy', 'clifford the big red dog',
    'arthur', 'cyberchase', 'the magic school bus', 'dragon tales', 'peg + cat', 'reading rainbow',
    'wordworld', 'zoboomafoo', 'curious george', 'caillou', 'toopy and binoo', 'the big comfy couch',
    'timothy goes to school', 'maggie and the ferocious beast', 'babar', 'rugrats', 'hey arnold!',
    'lazytown', 'veggietales', 'muppet babies', 'sesame street', 'shaun the sheep', 'little einsteins',
    'mickey mouse clubhouse', 'sofia the first', 'bubble guppies', 'team umizoomi',
    'pippi longstocking', 'sanzoku no musume ronja', 'ronja the robber\'s daughter',
    'the wonderful adventures of nils', 'barbapapa', 'barbapapa around the world',
    'hamtaro', 'miffy', 'miffy\'s adventures big and small'
}

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

c.execute("SELECT id, title, creator_publisher, genre_category FROM kids_media WHERE media_type='show'")
shows = c.fetchall()

kept = []
excluded = []

for s in shows:
    s_id, title, creator, genre = s
    t_lower = (title or '').strip().lower()
    c_lower = (creator or '').strip().lower()

    if any(ex in t_lower for ex in STRICT_EXCLUDE_TITLES):
        excluded.append((s, "Combat/Teen/Overstimulating blacklist"))
        continue

    is_trusted = any(tp in c_lower for tp in TRUSTED_PUBLISHERS)
    is_golden = any(gt in t_lower for gt in GOLDEN_TITLES)

    if not is_trusted and not is_golden:
        excluded.append((s, f"Untrusted network: {creator}"))
        continue

    if 'Romance' in (genre or '') or 'Crime' in (genre or '') or 'War' in (genre or ''):
        excluded.append((s, f"Inappropriate genre: {genre}"))
        continue

    kept.append(s)

print(f"=== SAMPLE SANCTUARY KEPT SHOWS (first 40) ===")
for s in kept[:40]:
    print(f"[{s[0]}] \"{s[1]}\" | {s[2]} | {s[3]}")

print(f"\n=== SAMPLE EXCLUDED SHOWS (first 30) ===")
for s, reason in excluded[:30]:
    print(f"[{s[0]}] \"{s[1]}\" | {s[2]} | {s[3]} --> {reason}")
