import sqlite3
import json
import os
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

source_db = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'kids_media.db')
if not os.path.exists(source_db):
    source_db = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
output_dir = r'C:\Users\natan\.gemini\antigravity-ide\scratch\netflix-expo\constants'
output_file = os.path.join(output_dir, 'bundled_kids_media.json')

conn = sqlite3.connect(source_db)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# 24 Flagship Crown Jewels of the Calm Sanctuary
flagship_shows = [
    ('Bluey', 25259),
    ("Daniel Tiger's Neighborhood", 21229),
    ("Mister Rogers' Neighborhood", 2577),
    ('Trash Truck', 25079),
    ('Tumble Leaf', 22186),
    ('Little Bear', 2510),
    ('Arthur', 2282),
    ('Reading Rainbow', 2464),
    ('Curious George', 22970),
    ('Octonauts', 23014),
    ('Sarah & Duck', 22393),
    ("Blue's Clues", 2324),
    ('The Magic School Bus', 2316),
    ('Clifford the Big Red Dog', 2315),
    ('Franklin and Friends', 22258),
    ('Bear in the Big Blue House', 2430),
    ('Kipper', 23050),
    ('In the Night Garden...', 22104),
    ('Teletubbies', 2578),
    ('The New Adventures of Winnie the Pooh', 21678),
    ('Peg + Cat', 21230),
    ('Super WHY!', 22441),
    ('Sesame Street', 21797),
    ('Dragon Tales', 2301)
]

print("Extracting 3 starter episodes for each flagship show...")
bundled_episodes = {}
for name, show_id in flagship_shows:
    cursor.execute("""
        SELECT * FROM kids_media 
        WHERE parent_show_id = ? AND media_type = 'episode'
        ORDER BY id ASC 
        LIMIT 3
    """, (show_id,))
    eps = [dict(r) for r in cursor.fetchall()]
    if eps:
        bundled_episodes[str(show_id)] = eps
        print(f"  ✓ {name}: bundled {len(eps)} starter episodes")

# Sanctuary Categories: strictly query browsable_media (ZERO episodes, ZERO high stimulation)
categories = [
  {
    'id': 'bedtime',
    'title': 'Bedtime & Sleep Audio',
    'badge': 'Sleep Sanctuary',
    'icon': 'moon',
    'age': '0–2',
    'query': """
        SELECT * FROM browsable_media 
        WHERE media_type = 'music' 
          AND (genre_category LIKE '%Lullaby%' OR genre_category LIKE '%Sleep%' OR genre_category LIKE '%Bedtime%' 
               OR title LIKE '%Lullaby%' OR title LIKE '%Sleep%' OR title LIKE '%Piano%' OR title LIKE '%Brahms%' OR title LIKE '%Mozart%')
          AND creator_publisher NOT IN ('KIDZ BOP', 'KIDZ BOP Kids')
          AND title NOT LIKE '%KIDZ BOP%'
        ORDER BY stimulation_score ASC, id ASC 
        LIMIT 40
    """
  },
  {
    'id': 'feelings',
    'title': 'Feelings, Manners & Kindness',
    'badge': 'Social & Emotional',
    'icon': 'heart',
    'age': '2–6',
    'query': """
        SELECT * FROM browsable_media 
        WHERE (
            title LIKE 'Daniel Learns%'
            OR title LIKE '%Manners%'
            OR title LIKE '%Kindness%'
            OR title LIKE '%Feelings%'
            OR title LIKE '%Emotions%'
            OR title LIKE '%Patience%'
            OR id IN (21229, 2577)
        )
        AND media_type IN ('video', 'show')
        ORDER BY id ASC 
        LIMIT 30
    """
  },
  {
    'id': 'pbs',
    'title': 'PBS Kids Sanctuary',
    'badge': 'Gentle Storytelling',
    'icon': 'tv',
    'age': '2–6',
    'query': """
        SELECT * FROM browsable_media 
        WHERE media_type = 'show' 
          AND (
              id IN (21229, 2577, 2282, 2315, 2464, 21230, 22441, 2301, 22970)
              OR creator_publisher = 'PBS Kids'
          )
        ORDER BY 
          CASE WHEN id IN (21229, 2577, 2282, 2464, 2315) THEN 0 ELSE 1 END,
          title ASC 
        LIMIT 35
    """
  },
  {
    'id': 'phonics',
    'title': 'Phonics & Early ABCs',
    'badge': 'Letters & Reading',
    'icon': 'book',
    'age': '2–5',
    'query': """
        SELECT * FROM browsable_media 
        WHERE (
            creator_publisher = 'Alphablocks' 
            OR title LIKE '%Alphablock%' 
            OR (genre_category LIKE '%Phonics%' AND media_type IN ('video', 'music'))
            OR (title LIKE '%ABC%' AND creator_publisher IN ('Sesame Street', 'Super Simple Songs'))
            OR (title LIKE '%Alphabet%' AND creator_publisher IN ('Sesame Street', 'Super Simple Songs'))
            OR (title LIKE '%Letters%' AND creator_publisher = 'Sesame Street')
        )
        AND creator_publisher NOT IN ('KIDZ BOP', 'KIDZ BOP Kids')
        AND title NOT LIKE '%Count%'
        ORDER BY id ASC 
        LIMIT 35
    """
  },
  {
    'id': 'math',
    'title': 'Early Math & Number Sense',
    'badge': 'Numbers & Counting',
    'icon': 'calculator',
    'age': '3–6',
    'query': """
        SELECT * FROM browsable_media 
        WHERE (
            creator_publisher = 'Numberblocks' 
            OR title LIKE '%Numberblock%' 
            OR (title LIKE '%Count%' AND creator_publisher IN ('Sesame Street', 'Super Simple Songs', 'The Wiggles'))
            OR (genre_category LIKE '%Math%' AND media_type IN ('video', 'music'))
            OR title LIKE '%Number of the Day%'
        )
        AND title NOT LIKE '%Count on You%'
        AND title NOT LIKE '%Creepy%'
        ORDER BY id ASC 
        LIMIT 35
    """
  },
  {
    'id': 'stem',
    'title': 'STEM & Little Scientists',
    'badge': 'Curious Science',
    'icon': 'flask',
    'age': '4–9',
    'query': """
        SELECT * FROM browsable_media 
        WHERE (
            creator_publisher IN ('SciShow Kids', 'Crash Course Kids', 'The Dr. Binocs Show', 'Free School', 'The Magic School Bus')
            OR id = 2316
            OR (title LIKE '%Science%' AND creator_publisher IN ('PBS Kids', 'Scholastic Classic'))
        )
        ORDER BY id ASC 
        LIMIT 35
    """
  },
  {
    'id': 'discovery',
    'title': 'Curious Animals & Nature',
    'badge': 'Living Planet',
    'icon': 'leaf',
    'age': '3–8',
    'query': """
        SELECT * FROM browsable_media 
        WHERE (
            id IN (23014, 25079, 22186)
            OR creator_publisher IN ('Nat Geo Kids')
            OR title IN ('Wild Kratts', 'Dinosaur Train', 'Octonauts', 'Zoboomafoo', 'Andy''s Dinosaur Adventures', 'Andy''s Baby Animals')
            OR (genre_category LIKE '%Nature%' AND media_type = 'video')
        )
        AND creator_publisher NOT IN ('Art for Kids Hub')
        AND title NOT LIKE 'How To Draw%'
        ORDER BY stimulation_score ASC, id ASC 
        LIMIT 35
    """
  },
  {
    'id': 'nursery',
    'title': 'Toddler Sing-Alongs',
    'badge': 'Early Rhythm',
    'icon': 'musical-notes',
    'age': '1–4',
    'query': """
        SELECT * FROM browsable_media 
        WHERE media_type = 'music' 
          AND (creator_publisher IN ('Super Simple Songs', 'The Wiggles', 'Cocomelon', 'Sesame Street', 'Teletubbies - WildBrain') 
               OR genre_category LIKE '%Nursery%' OR genre_category LIKE '%Toddler%')
          AND (target_age_group IN ('0-2', '1-4', '1-5', '2-6', '3-5') OR target_age_group IS NULL)
          AND creator_publisher NOT IN ('KIDZ BOP', 'KIDZ BOP Kids', 'Disney Music [DM]')
          AND title NOT LIKE '%KIDZ BOP%'
          AND title NOT LIKE '%作業用BGM%'
        ORDER BY stimulation_score ASC, id ASC 
        LIMIT 40
    """
  },
  {
    'id': 'nick_jr',
    'title': 'Nick Jr. Gentle Classics',
    'badge': 'Preschool Heritage',
    'icon': 'paw',
    'age': '2–6',
    'query': """
        SELECT * FROM browsable_media 
        WHERE media_type = 'show' 
          AND (
              id IN (2324, 2510, 2430)
              OR creator_publisher = 'Nick Jr.' 
              OR title IN ('Blue''s Clues', 'Blue''s Clues & You!', 'Blue''s Room', 'Dora the Explorer', 
                           'Little Bear', 'Oswald', 'Wonder Pets', 'The Backyardigans', 'Bubble Guppies', 'Team Umizoomi', 
                           'Ni Hao, Kai-lan', 'Gullah Gullah Island', 'Jack''s Big Music Show', 
                           'Franklin and Friends', 'Peter Rabbit', 'Olivia')
          )
          AND title NOT IN ('100 Things to Do Before High School', '100 Deeds for Eddie McDowd', 
                            'Aaahh!!! Real Monsters', '3 Friends and Jerry', 'All That', 'Deadtime Stories',
                            'Drake & Josh', 'Victorious', 'Zoey 101', 'iCarly')
        ORDER BY 
          CASE WHEN id IN (2324, 2510, 2430) THEN 0 ELSE 1 END,
          title ASC 
        LIMIT 35
    """
  },
  {
    'id': 'disney',
    'title': 'Disney Junior Gentle Tales',
    'badge': 'Magical Preschool',
    'icon': 'sparkles',
    'age': '2–6',
    'query': """
        SELECT * FROM browsable_media 
        WHERE media_type = 'show' 
          AND (
              id IN (25259, 21678)
              OR creator_publisher = 'Disney Junior' 
              OR title IN ('Bluey', 'Sofia the First', 'Little Einsteins', 'Handy Manny', 'Rolie Polie Olie', 
                           'Out of the Box', 'PB&J Otter', 'Playdate with Winnie the Pooh', 'The Book of Pooh', 
                           'Welcome to Pooh Corner', 'Muppet Babies', 'Pupstruction', 
                           'Special Agent Oso', 'Doc McStuffins', 'Sheriff Callie''s Wild West')
          )
          AND title NOT IN ('Hannah Montana', 'Wizards of Waverly Place', 'Lizzie McGuire', 'That''s So Raven', 
                            'Good Luck Charlie', 'Liv & Maddie', 'Austin & Ally', 'Girl Meets World')
        ORDER BY 
          CASE WHEN id IN (25259, 21678) THEN 0 ELSE 1 END,
          title ASC 
        LIMIT 35
    """
  },
  {
    'id': 'bbc',
    'title': 'CBeebies British Heritage',
    'badge': 'Calm Broadcast',
    'icon': 'sunny',
    'age': '0–5',
    'query': """
        SELECT * FROM browsable_media 
        WHERE media_type = 'show' 
          AND (
              id IN (22393, 22104, 2578)
              OR creator_publisher = 'CBeebies' 
              OR title IN ('Sarah & Duck', 'In the Night Garden...', 'Teletubbies', 'Hey Duggee', 
                           'Charlie and Lola', 'Bing', 'Postman Pat', 'Bob the Builder', 'Baby Jake',
                           'Andy''s Dinosaur Adventures', 'Andy''s Aquatic Adventures', 'Balamory', '64 Zoo Lane')
          )
        ORDER BY 
          CASE WHEN id IN (22393, 22104, 2578) THEN 0 ELSE 1 END,
          title ASC 
        LIMIT 35
    """
  },
  {
    'id': 'art_studio',
    'title': 'Creative Art & Drawing Studio',
    'badge': 'Hands-On Art',
    'icon': 'color-palette',
    'age': '4–10',
    'query': """
        SELECT * FROM browsable_media 
        WHERE (
            creator_publisher = 'Art for Kids Hub'
            OR title LIKE 'How To Draw%'
        )
        AND media_type = 'video'
        ORDER BY id ASC 
        LIMIT 25
    """
  },
  {
    'id': 'pop',
    'title': 'Joyful Movement & Play Songs',
    'badge': 'Gentle Rhythm',
    'icon': 'radio',
    'age': '3–8',
    'query': """
        SELECT * FROM browsable_media 
        WHERE media_type = 'music' 
          AND (creator_publisher IN ('The Wiggles', 'Super Simple Songs', 'Sesame Street', 'Raffi') 
               OR genre_category LIKE '%Nursery%' OR genre_category LIKE '%Sing%' OR title LIKE '%Dance%' OR title LIKE '%Sing%' OR title LIKE '%Song%')
        ORDER BY id ASC 
        LIMIT 35
    """
  },
  {
    'id': 'big_kids',
    'title': 'Big Kids Animated Quests',
    'badge': 'Heroic Adventures',
    'icon': 'flash',
    'age': '6–9',
    'query': """
        SELECT * FROM browsable_media 
        WHERE media_type = 'show' 
          AND (target_age_group IN ('6-9', '6-12') 
               OR title IN ('WordGirl', 'Dragon Tales', 'The Magic School Bus', 'Arthur', 'The Upside Down Show', 'The Voyage of the Mimi', 'Elena of Avalor', 'Maddigan''s Quest', 'Hotel Transylvania: The Series', 'Stickin'' Around'))
        ORDER BY title ASC 
        LIMIT 35
    """
  },
  {
    'id': 'tweens',
    'title': 'Tween Classics & Live-Action',
    'badge': 'Iconic Laughs',
    'icon': 'star',
    'age': '8–12',
    'query': """
        SELECT * FROM browsable_media 
        WHERE media_type = 'show' 
          AND (target_age_group = '8-12' 
               OR title IN ('iCarly', 'Hannah Montana', 'Wizards of Waverly Place', 'Good Luck Charlie', 
                            'That''s So Raven', 'Drake & Josh', 'The Suite Life of Zack and Cody', 
                            'Lizzie McGuire', 'Zoey 101', 'Victorious', 'Austin & Ally', 'Liv & Maddie',
                            'Girl Meets World', 'K.C. Undercover', 'JONAS', 'Sonny with a Chance',
                            'Even Stevens', 'Phil of the Future', 'Stuck in the Middle', 'Sydney to the Max',
                            'Unfabulous', 'The Haunted Hathaways'))
        ORDER BY title ASC 
        LIMIT 25
    """
  }
]

category_data = {}
for cat in categories:
    cursor.execute(cat['query'])
    rows = [dict(r) for r in cursor.fetchall()]
    category_data[cat['id']] = rows
    print(f"Extracted {len(rows)} for {cat['title']}")

# Default Calm Feed: strictly preschool & gentle items from browsable_media
cursor.execute("""
    SELECT * FROM browsable_media 
    WHERE stimulation_label = 'calm' 
      AND (target_age_group IN ('0-2', '1-4', '1-5', '2-6', '3-5', '3-8', 'All', 'Preschool') OR target_age_group IS NULL)
    ORDER BY stimulation_score ASC, id ASC 
    LIMIT 100
""")
calm_feed = [dict(r) for r in cursor.fetchall()]
print(f"Extracted {len(calm_feed)} for Default Calm Feed")

payload = {
    'categories': [
        {
            'id': c['id'],
            'title': c['title'],
            'badge': c['badge'],
            'icon': c['icon'],
            'age': c['age'],
            'count': len(category_data[c['id']])
        }
        for c in categories
    ],
    'categoryItems': category_data,
    'calmFeed': calm_feed,
    'bundledEpisodes': bundled_episodes
}

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(payload, f, ensure_ascii=False)

stat = os.stat(output_file)
size_mb = round(stat.st_size / (1024 * 1024), 2)
print(f"\n==========================================")
print(f"✓ Golden Offline Bundle saved successfully!")
print(f"  Path: {output_file}")
print(f"  Size: {size_mb} MB ({stat.st_size:,} bytes)")
print(f"  Flagship Shows with Starter Episodes: {len(bundled_episodes)}")
print(f"  Total Bundled Episodes: {sum(len(eps) for eps in bundled_episodes.values())}")
print(f"==========================================")
