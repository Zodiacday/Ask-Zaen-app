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
print("DEEP-DIVE: EXISTING EDUCATIONAL YOUTUBE & VIDEO ASSETS IN DB")
print("="*80)

categories = {
    'Math & Numbers': """
        SELECT count(*), group_concat(title, ' || ') 
        FROM kids_media 
        WHERE media_type IN ('video', 'music')
          AND (creator_publisher = 'Numberblocks' 
               OR title LIKE '%Numberblock%' 
               OR title LIKE '%Count%' 
               OR title LIKE '%Math%' 
               OR genre_category LIKE '%Math%')
    """,
    'Phonics & Reading': """
        SELECT count(*), group_concat(title, ' || ') 
        FROM kids_media 
        WHERE media_type IN ('video', 'music')
          AND (creator_publisher = 'Alphablocks' 
               OR title LIKE '%Alphablock%' 
               OR title LIKE '%Phonics%' 
               OR title LIKE '%Alphabet%' 
               OR title LIKE '%ABC%' 
               OR genre_category LIKE '%Phonics%')
    """,
    'Science & Nature': """
        SELECT count(*), group_concat(title, ' || ') 
        FROM kids_media 
        WHERE media_type IN ('video', 'show')
          AND (creator_publisher IN ('Nat Geo Kids', 'The Magic School Bus')
               OR title LIKE '%Science%' 
               OR title LIKE '%Animal%' 
               OR title LIKE '%Space%' 
               OR title LIKE '%Ocean%' 
               OR title LIKE '%Dinosaur%' 
               OR title LIKE '%Weather%')
    """,
    'Social & Emotional Regulation': """
        SELECT count(*), group_concat(title, ' || ') 
        FROM kids_media 
        WHERE media_type IN ('video', 'show')
          AND (title LIKE '%Daniel Learns%' 
               OR title LIKE '%Feelings%' 
               OR title LIKE '%Emotions%' 
               OR title LIKE '%Kindness%' 
               OR title LIKE '%Patience%'
               OR title LIKE '%Manners%')
    """,
    'Creative Art & Drawing': """
        SELECT count(*), group_concat(title, ' || ') 
        FROM kids_media 
        WHERE media_type IN ('video')
          AND (creator_publisher = 'Art for Kids Hub' 
               OR title LIKE '%How To Draw%' 
               OR title LIKE '%Drawing%' 
               OR genre_category LIKE '%Art%')
    """
}

for cat_name, query in categories.items():
    c.execute(query)
    row = c.fetchone()
    count = row[0]
    titles = (row[1] or '').split(' || ')[:3]
    print(f"\n📁 {cat_name}: {count:,} items found in DB")
    for t in titles:
        if t:
            print(f"    - {t[:75]}")

conn.close()
