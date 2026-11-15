import sqlite3
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conn = sqlite3.connect(r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

edu_specs = [
    {
        'id': 'phonics',
        'title': 'Phonics & Early Reading',
        'query': """
            SELECT title, creator_publisher, target_age_group, stimulation_score FROM kids_media
            WHERE (
                creator_publisher = 'Alphablocks'
                OR title LIKE '%Alphablock%'
                OR (genre_category LIKE '%Phonics%' AND media_type IN ('video', 'music'))
                OR (title LIKE '%ABC%' AND creator_publisher IN ('Sesame Street', 'Super Simple Songs'))
                OR (title LIKE '%Alphabet%' AND creator_publisher IN ('Sesame Street', 'Super Simple Songs'))
            )
            AND creator_publisher NOT IN ('KIDZ BOP', 'KIDZ BOP Kids')
            ORDER BY id ASC
            LIMIT 50
        """
    },
    {
        'id': 'math',
        'title': 'Early Math & Number Sense',
        'query': """
            SELECT title, creator_publisher, target_age_group, stimulation_score FROM kids_media
            WHERE (
                creator_publisher = 'Numberblocks'
                OR title LIKE '%Numberblock%'
                OR (title LIKE '%Count%' AND creator_publisher IN ('Sesame Street', 'Super Simple Songs', 'The Wiggles'))
                OR (genre_category LIKE '%Math%' AND media_type IN ('video', 'music'))
            )
            AND title NOT LIKE '%Count on You%'
            ORDER BY id ASC
            LIMIT 50
        """
    },
    {
        'id': 'stem',
        'title': 'STEM & Little Scientists',
        'query': """
            SELECT title, creator_publisher, target_age_group, stimulation_score FROM kids_media
            WHERE (
                creator_publisher IN ('SciShow Kids', 'Crash Course Kids', 'The Dr. Binocs Show', 'Free School', 'The Magic School Bus')
                OR (title LIKE '%Science%' AND creator_publisher IN ('PBS Kids', 'Scholastic Classic'))
            )
            ORDER BY id ASC
            LIMIT 50
        """
    },
    {
        'id': 'discovery',
        'title': 'Curious Animals & Nature',
        'query': """
            SELECT title, creator_publisher, target_age_group, stimulation_score FROM kids_media
            WHERE (
                creator_publisher IN ('Nat Geo Kids')
                OR title IN ('Wild Kratts', 'Dinosaur Train', 'Octonauts', 'Zoboomafoo', 'Andy''s Dinosaur Adventures', 'Andy''s Baby Animals')
                OR (genre_category LIKE '%Nature%' AND media_type = 'video')
            )
            AND creator_publisher NOT IN ('Art for Kids Hub')
            AND title NOT LIKE 'How To Draw%'
            ORDER BY stimulation_score ASC, id ASC
            LIMIT 50
        """
    },
    {
        'id': 'feelings',
        'title': 'Feelings, Manners & Kindness',
        'query': """
            SELECT title, creator_publisher, target_age_group, stimulation_score FROM kids_media
            WHERE (
                title LIKE 'Daniel Learns%'
                OR title LIKE '%Manners%'
                OR title LIKE '%Kindness%'
                OR title LIKE '%Feelings%'
                OR title LIKE '%Emotions%'
                OR title LIKE '%Patience%'
                OR title IN ('Mister Rogers'' Neighborhood', 'Daniel Tiger''s Neighborhood')
            )
            AND media_type IN ('video', 'show')
            ORDER BY id ASC
            LIMIT 50
        """
    },
    {
        'id': 'art_studio',
        'title': 'Creative Art & Drawing Studio',
        'query': """
            SELECT title, creator_publisher, target_age_group, stimulation_score FROM kids_media
            WHERE (
                creator_publisher = 'Art for Kids Hub'
                OR title LIKE 'How To Draw%'
            )
            AND media_type = 'video'
            ORDER BY id ASC
            LIMIT 50
        """
    }
]

for spec in edu_specs:
    cursor.execute(spec['query'])
    rows = cursor.fetchall()
    print(f"\n✅ {spec['title']} ({spec['id']}): {len(rows)} items")
    for r in rows[:3]:
        print(f"   • {r['title'][:50]:<50} | {r['creator_publisher']} | Age: {r['target_age_group']} | Score: {r['stimulation_score']}")

conn.close()
