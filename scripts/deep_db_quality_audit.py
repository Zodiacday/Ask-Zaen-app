import sqlite3
import json
import io
import sys
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
c = conn.cursor()

print("="*80)
print("COMPREHENSIVE DATABASE QUALITY AUDIT: kids_media.db")
print("="*80)

# 1. Total row count and media types
c.execute("SELECT media_type, count(*) FROM kids_media GROUP BY media_type")
type_counts = dict(c.fetchall())
total_rows = sum(type_counts.values())
print(f"\n1. TOTAL INVENTORY: {total_rows:,} records")
for mtype, count in type_counts.items():
    print(f"   - {mtype:<10}: {count:>7,} ({count/total_rows*100:5.1f}%)")

# 2. Metadata Field Completeness across media_types (shows, videos, music)
print("\n2. METADATA COMPLETENESS (Non-Episode Catalog: Shows, Videos, Music):")
c.execute("SELECT count(*) FROM kids_media WHERE media_type != 'episode'")
catalog_total = c.fetchone()[0]
print(f"   Total Catalog Items: {catalog_total:,}")

fields = [
    'title', 'description', 'platform_url', 'creator_publisher', 
    'target_age_group', 'genre_category', 'duration', 'release_year', 
    'metadata_json', 'stimulation_score', 'stimulation_label', 'safety_rating_tags'
]

for field in fields:
    c.execute(f"""
        SELECT 
            count(CASE WHEN {field} IS NOT NULL AND trim({field}) != '' AND {field} != 'N/A' THEN 1 END)
        FROM kids_media 
        WHERE media_type != 'episode'
    """)
    filled = c.fetchone()[0]
    pct = (filled / catalog_total) * 100
    print(f"   - {field:<22}: {filled:>5,} / {catalog_total} ({pct:5.1f}%)")

# 3. Poster Image Availability (from metadata_json or platform_url)
print("\n3. POSTER / ARTWORK AVAILABILITY:")
c.execute("SELECT id, media_type, platform_url, metadata_json FROM kids_media WHERE media_type != 'episode'")
catalog_rows = c.fetchall()

has_tvmaze_image = 0
has_youtube_thumb = 0
no_image = 0

for r in catalog_rows:
    found = False
    if r['metadata_json']:
        try:
            m = json.loads(r['metadata_json'])
            if m.get('image'):
                has_tvmaze_image += 1
                found = True
        except:
            pass
    if not found and r['platform_url'] and 'youtube.com' in r['platform_url']:
        has_youtube_thumb += 1
        found = True
    if not found:
        no_image += 1

print(f"   - High-Res Studio Posters (TVMaze / Metadata) : {has_tvmaze_image:>5,} ({has_tvmaze_image/catalog_total*100:5.1f}%)")
print(f"   - YouTube Thumbnail Fallbacks                : {has_youtube_thumb:>5,} ({has_youtube_thumb/catalog_total*100:5.1f}%)")
print(f"   - Missing / Fallback Required                : {no_image:>5,} ({no_image/catalog_total*100:5.1f}%)")

# 4. Playability / Platform URL breakdown
print("\n4. PLAYABILITY & DESTINATION PLATFORMS:")
c.execute("SELECT media_type, platform_url FROM kids_media WHERE media_type != 'episode'")
platforms = Counter()
for r in c.fetchall():
    url = (r['platform_url'] or '').lower()
    if 'youtube.com' in url or 'youtu.be' in url:
        platforms['YouTube (Direct Playable)'] += 1
    elif 'tvmaze.com' in url:
        platforms['TVMaze Reference URL'] += 1
    elif url == '':
        platforms['Missing URL'] += 1
    else:
        platforms['Other / Custom URL'] += 1

for plat, cnt in platforms.most_common():
    print(f"   - {plat:<30}: {cnt:>5,} ({cnt/catalog_total*100:5.1f}%)")

# 5. Episodes Integrity: Orphan check
print("\n5. EPISODES DATA INTEGRITY:")
c.execute("SELECT count(*) FROM kids_media WHERE media_type = 'episode'")
total_eps = c.fetchone()[0]

c.execute("""
    SELECT count(*) 
    FROM kids_media ep 
    LEFT JOIN kids_media sh ON ep.parent_show_id = sh.id 
    WHERE ep.media_type = 'episode' AND sh.id IS NULL
""")
orphaned_eps = c.fetchone()[0]

c.execute("""
    SELECT count(DISTINCT parent_show_id) FROM kids_media WHERE media_type = 'episode'
""")
shows_with_episodes = c.fetchone()[0]

print(f"   - Total Episodes Stored         : {total_eps:>7,}")
print(f"   - Parent Shows Represented       : {shows_with_episodes:>7,}")
print(f"   - Orphaned Episodes (broken FK)  : {orphaned_eps:>7,} (should be 0)")

# 6. Duplication Check
print("\n6. DUPLICATION AUDIT:")
c.execute("""
    SELECT title, media_type, count(*) 
    FROM kids_media 
    WHERE media_type != 'episode' 
    GROUP BY lower(trim(title)), media_type 
    HAVING count(*) > 1
""")
dup_titles = c.fetchall()
print(f"   - Titles with duplicate records : {len(dup_titles)}")
if dup_titles:
    print("     Sample duplicates:")
    for d in dup_titles[:5]:
        print(f"       * '{d[0]}' ({d[1]}) appears {d[2]} times")

c.execute("""
    SELECT platform_url, count(*) 
    FROM kids_media 
    WHERE platform_url IS NOT NULL AND platform_url != '' AND media_type != 'episode'
    GROUP BY platform_url 
    HAVING count(*) > 1
""")
dup_urls = c.fetchall()
print(f"   - Duplicate Platform URLs       : {len(dup_urls)}")

# 7. Sensory Scoring Breakdown
print("\n7. SENSORY & STIMULATION LABELS:")
c.execute("SELECT stimulation_label, count(*) FROM kids_media WHERE media_type != 'episode' GROUP BY stimulation_label")
for r in c.fetchall():
    print(f"   - {str(r[0]):<15}: {r[1]:>5,} ({r[1]/catalog_total*100:5.1f}%)")

conn.close()
