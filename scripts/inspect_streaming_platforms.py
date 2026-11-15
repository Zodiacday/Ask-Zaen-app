import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conn = sqlite3.connect(r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

print("="*80)
print("INSPECTING STREAMING SERVICE PLATFORMS IN KIDS_MEDIA.DB")
print("="*80)

# Check platform_url domains
c.execute("""
    SELECT 
        CASE 
            WHEN platform_url LIKE '%youtube.com%' OR platform_url LIKE '%youtu.be%' THEN 'YouTube'
            WHEN platform_url LIKE '%netflix.com%' THEN 'Netflix'
            WHEN platform_url LIKE '%disneyplus.com%' THEN 'Disney+'
            WHEN platform_url LIKE '%amazon.com%' OR platform_url LIKE '%primevideo.com%' THEN 'Prime Video'
            WHEN platform_url LIKE '%apple.com%' THEN 'Apple TV+'
            WHEN platform_url LIKE '%pbskids.org%' THEN 'PBS Kids'
            WHEN platform_url IS NULL OR platform_url = '' THEN 'No URL (TV Show / Catalog)'
            ELSE 'Other'
        END as platform,
        count(*)
    FROM kids_media
    GROUP BY platform
""")
print("Platform URL Breakdown across 74,765 records:")
for r in c.fetchall():
    print(f"  • {r[0]:<25}: {r[1]:>7,} items")

# Check metadata_json for streaming platforms or networks
c.execute("SELECT id, title, creator_publisher, metadata_json, platform_url FROM kids_media WHERE media_type = 'show' LIMIT 10")
print("\nSample TV Shows metadata_json:")
for r in c.fetchall():
    meta = json.loads(r['metadata_json']) if r['metadata_json'] else {}
    network = meta.get('network') or meta.get('webChannel') or {}
    print(f"  [{r['id']}] {r['title']} | Creator: {r['creator_publisher']} | URL: {r['platform_url']}")
    if network:
        print(f"       Network info: {network}")

conn.close()
