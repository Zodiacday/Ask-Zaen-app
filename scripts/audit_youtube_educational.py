import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
c = conn.cursor()

print("="*80)
print("INVENTORY OF YOUTUBE EDUCATIONAL CONTENT IN KIDS_MEDIA.DB")
print("="*80)

# Check YouTube videos count
c.execute("""
    SELECT count(*) 
    FROM kids_media 
    WHERE platform_url LIKE '%youtube.com%' OR platform_url LIKE '%youtu.be%'
""")
yt_count = c.fetchone()[0]
print(f"Total YouTube Items in DB: {yt_count:,}\n")

# Breakdown by media_type
c.execute("""
    SELECT media_type, count(*) 
    FROM kids_media 
    WHERE platform_url LIKE '%youtube.com%' OR platform_url LIKE '%youtu.be%'
    GROUP BY media_type
""")
print("YouTube Items by Media Type:")
for r in c.fetchall():
    print(f"  • {r[0]}: {r[1]:,}")

# YouTube Creators / Channels
print("\n" + "-"*80)
print("Top YouTube Creators / Channels in DB:")
c.execute("""
    SELECT creator_publisher, media_type, count(*), 
           group_concat(DISTINCT genre_category) as genres
    FROM kids_media 
    WHERE platform_url LIKE '%youtube.com%' OR platform_url LIKE '%youtu.be%'
    GROUP BY creator_publisher, media_type
    ORDER BY count(*) DESC
    LIMIT 30
""")
for r in c.fetchall():
    creator = r[0] if r[0] else 'Unknown'
    genres = r['genres'] if r['genres'] else 'None'
    print(f"  • {creator:<32} [{r['media_type']:<5}]: {r[2]:>4} items | Genres: {genres[:40]}")

# Look specifically for educational keywords across YouTube items
print("\n" + "-"*80)
print("Educational Keyword Distribution in YouTube items:")
edu_keywords = [
    'science', 'math', 'phonics', 'alphabet', 'reading', 'nature', 'animal', 
    'history', 'space', 'stem', 'learn', 'education', 'experiment', 'discovery'
]

for kw in edu_keywords:
    c.execute("""
        SELECT count(*) 
        FROM kids_media 
        WHERE (platform_url LIKE '%youtube.com%' OR platform_url LIKE '%youtu.be%')
          AND (title LIKE ? OR description LIKE ? OR genre_category LIKE ?)
    """, (f"%{kw}%", f"%{kw}%", f"%{kw}%"))
    cnt = c.fetchone()[0]
    print(f"  • Keyword '{kw:<11}': {cnt:>4} items")

# Check sample YouTube items
print("\n" + "-"*80)
print("Sample Educational YouTube Videos in DB:")
c.execute("""
    SELECT id, title, creator_publisher, genre_category, target_age_group, stimulation_score, stimulation_label, platform_url
    FROM kids_media 
    WHERE (platform_url LIKE '%youtube.com%' OR platform_url LIKE '%youtu.be%')
      AND (genre_category LIKE '%Education%' OR genre_category LIKE '%Science%' OR genre_category LIKE '%Nature%' OR genre_category LIKE '%Phonics%' OR title LIKE '%Learn%' OR title LIKE '%Number%' OR title LIKE '%Letter%')
    LIMIT 15
""")
for r in c.fetchall():
    print(f"  [{r['id']}] {r['title'][:45]:<45} | Creator: {(r['creator_publisher'] or ''):<20} | Age: {r['target_age_group']} | Score: {r['stimulation_score']}")

conn.close()
