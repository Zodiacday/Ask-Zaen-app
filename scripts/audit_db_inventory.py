import sqlite3
import io
import sys
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conn = sqlite3.connect(r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db')
c = conn.cursor()

print("="*80)
print("DATABASE INVENTORY AUDIT")
print("="*80)

# Total count by media_type
c.execute("SELECT media_type, count(*) FROM kids_media GROUP BY media_type")
print("\nMedia Type distribution:")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]:,}")

# Shows breakdown by creator/publisher
c.execute("SELECT creator_publisher, count(*) FROM kids_media WHERE media_type='show' GROUP BY creator_publisher ORDER BY count(*) DESC LIMIT 20")
print("\nTop Show Publishers:")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]:,}")

# Videos breakdown by creator/publisher
c.execute("SELECT creator_publisher, count(*) FROM kids_media WHERE media_type='video' GROUP BY creator_publisher ORDER BY count(*) DESC LIMIT 20")
print("\nTop Video Creators:")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]:,}")

# Music breakdown by creator/publisher
c.execute("SELECT creator_publisher, count(*) FROM kids_media WHERE media_type='music' GROUP BY creator_publisher ORDER BY count(*) DESC LIMIT 20")
print("\nTop Music Publishers:")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]:,}")

# Target age groups distribution
c.execute("SELECT target_age_group, count(*) FROM kids_media WHERE media_type != 'episode' GROUP BY target_age_group ORDER BY count(*) DESC")
print("\nTarget Age Group distribution (non-episodes):")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]:,}")
