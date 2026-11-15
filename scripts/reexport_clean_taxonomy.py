import sqlite3
import json
import os
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

source_db = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
output_dir = r'C:\Users\natan\.gemini\antigravity-ide\scratch\netflix-expo\constants'
output_file = os.path.join(output_dir, 'bundled_kids_media.json')

conn = sqlite3.connect(source_db)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Additional Big Kids and Tweens Show IDs to enrich their collections
extra_big_kids = [2381, 2698, 2699, 2718, 2527, 2283] # Phineas and Ferb, DuckTales, Darkwing Duck, TaleSpin, Teenage Robot, Cyberchase
extra_tweens = [21193, 21333, 21366, 21384, 21385, 21386, 21690, 21768, 22072, 25003] # Girl Meets World, K.C. Undercover, JONAS, Sonny, Even Stevens, Phil of Future, Stuck in Middle, Unfabulous, Haunted Hathaways, Sydney to Max

# Update target_age_group in DB for these extra shows
cursor.execute(f"UPDATE kids_media SET target_age_group = '6-9' WHERE id IN ({','.join(['?']*len(extra_big_kids))}) OR parent_show_id IN ({','.join(['?']*len(extra_big_kids))})", extra_big_kids + extra_big_kids)
cursor.execute(f"UPDATE kids_media SET target_age_group = '8-12' WHERE id IN ({','.join(['?']*len(extra_tweens))}) OR parent_show_id IN ({','.join(['?']*len(extra_tweens))})", extra_tweens + extra_tweens)
conn.commit()
print("Updated age tags for enriched Big Kids and Tween shows in DB.")

categories = [
  {
    'id': 'bedtime',
    'title': 'Bedtime & Sleep Audio',
    'badge': 'Sleep Sanctuary',
    'icon': 'moon',
    'age': '0–2',
    'query': """
        SELECT * FROM kids_media 
        WHERE media_type = 'music' 
          AND (genre_category LIKE '%Lullaby%' OR genre_category LIKE '%Sleep%' OR genre_category LIKE '%Bedtime%' 
               OR title LIKE '%Lullaby%' OR title LIKE '%Sleep%' OR title LIKE '%Piano%' OR title LIKE '%Brahms%' OR title LIKE '%Mozart%')
          AND creator_publisher NOT IN ('KIDZ BOP', 'KIDZ BOP Kids')
          AND title NOT LIKE '%KIDZ BOP%'
        ORDER BY stimulation_score ASC, id ASC 
        LIMIT 50
    """
  },
  {
    'id': 'nursery',
    'title': 'Toddler Sing-Alongs',
    'badge': 'Early Rhythm',
    'icon': 'musical-notes',
    'age': '1–4',
    'query': """
        SELECT * FROM kids_media 
        WHERE media_type = 'music' 
          AND (creator_publisher IN ('Super Simple Songs', 'The Wiggles', 'Cocomelon', 'Sesame Street', 'Teletubbies - WildBrain') 
               OR genre_category LIKE '%Nursery%' OR genre_category LIKE '%Toddler%')
          AND (target_age_group IN ('0-2', '1-4', '1-5', '2-6', '3-5') OR target_age_group IS NULL)
          AND creator_publisher NOT IN ('KIDZ BOP', 'KIDZ BOP Kids', 'Disney Music [DM]')
          AND title NOT LIKE '%KIDZ BOP%'
          AND title NOT LIKE '%作業用BGM%'
        ORDER BY stimulation_score ASC, id ASC 
        LIMIT 50
    """
  },
  {
    'id': 'phonics',
    'title': 'Phonics & Early ABCs',
    'badge': 'Foundations',
    'icon': 'book',
    'age': '2–5',
    'query': """
        SELECT * FROM kids_media 
        WHERE (genre_category LIKE '%Phonics%' OR title LIKE '%Alphabet%' OR title LIKE '%ABC%' OR title LIKE '%Phonics%' 
               OR creator_publisher IN ('Alphablocks', 'Numberblocks'))
          AND media_type IN ('music', 'video')
          AND creator_publisher NOT IN ('KIDZ BOP', 'KIDZ BOP Kids')
          AND title NOT LIKE '%KIDZ BOP%'
        ORDER BY id ASC 
        LIMIT 50
    """
  },
  {
    'id': 'pbs',
    'title': 'PBS Kids Sanctuary',
    'badge': 'Gentle Storytelling',
    'icon': 'tv',
    'age': '2–6',
    'query': """
        SELECT * FROM kids_media 
        WHERE media_type = 'show' 
          AND (
              creator_publisher = 'PBS Kids' 
              OR title IN ('Mister Rogers'' Neighborhood', 'Daniel Tiger''s Neighborhood', 'Arthur', 
                           'Clifford the Big Red Dog', 'Dragon Tales', 'Peg + Cat', 'Reading Rainbow', 
                           'Donkey Hodie', 'Elinor Wonders Why', 'Alma''s Way', 'Sesame Street', 
                           'Molly of Denali', 'Rosie''s Rules', 'Curious George', 'Nature Cat',
                           'Sid the Science Kid', 'Dinosaur Train', 'Angelina Ballerina')
          )
        ORDER BY title ASC 
        LIMIT 50
    """
  },
  {
    'id': 'nick_jr',
    'title': 'Nick Jr. Gentle Classics',
    'badge': 'Preschool Heritage',
    'icon': 'paw',
    'age': '2–6',
    'query': """
        SELECT * FROM kids_media 
        WHERE media_type = 'show' 
          AND (
              creator_publisher = 'Nick Jr.' 
              OR title IN ('Blue''s Clues', 'Blue''s Clues & You!', 'Blue''s Room', 'Dora the Explorer', 
                           'Dora and Friends: Into the City!', 'Go, Diego, Go!', 'Little Bear', 'Oswald', 
                           'Wonder Pets', 'The Backyardigans', 'Bubble Guppies', 'Team Umizoomi', 
                           'Ni Hao, Kai-lan', 'Gullah Gullah Island', 'Jack''s Big Music Show', 
                           'Franklin and Friends', 'Peter Rabbit', 'Olivia', 'Santiago of the Seas', 
                           'The Adventures of Paddington', 'Shimmer and Shine', 'Blaze and the Monster Machines')
          )
          AND title NOT IN ('100 Things to Do Before High School', '100 Deeds for Eddie McDowd', 
                            'Aaahh!!! Real Monsters', '3 Friends and Jerry', 'All That', 'Deadtime Stories',
                            'Drake & Josh', 'Victorious', 'Zoey 101', 'iCarly')
        ORDER BY title ASC 
        LIMIT 50
    """
  },
  {
    'id': 'disney',
    'title': 'Disney Junior Gentle Tales',
    'badge': 'Magical Preschool',
    'icon': 'sparkles',
    'age': '2–6',
    'query': """
        SELECT * FROM kids_media 
        WHERE media_type = 'show' 
          AND (
              creator_publisher = 'Disney Junior' 
              OR title IN ('Sofia the First', 'Little Einsteins', 'Handy Manny', 'Rolie Polie Olie', 
                           'Out of the Box', 'PB&J Otter', 'Playdate with Winnie the Pooh', 'The Book of Pooh', 
                           'Welcome to Pooh Corner', 'Muppet Babies', 'Pupstruction', 'Spidey and His Amazing Friends', 
                           'Special Agent Oso', 'Doc McStuffins', 'Sheriff Callie''s Wild West', 'Stanley', 'Higglytown Heroes')
          )
          AND title NOT IN ('Hannah Montana', 'Wizards of Waverly Place', 'Lizzie McGuire', 'That''s So Raven', 
                            'Good Luck Charlie', 'Liv & Maddie', 'Austin & Ally', 'Girl Meets World')
        ORDER BY title ASC 
        LIMIT 50
    """
  },
  {
    'id': 'bbc',
    'title': 'CBeebies British Heritage',
    'badge': 'Calm Broadcast',
    'icon': 'sunny',
    'age': '0–5',
    'query': """
        SELECT * FROM kids_media 
        WHERE media_type = 'show' 
          AND (creator_publisher = 'CBeebies' 
               OR title IN ('Teletubbies', 'In the Night Garden', 'Sarah & Duck', 'Hey Duggee', 
                            'Charlie and Lola', 'Bing', 'Postman Pat', 'Bob the Builder', 'Baby Jake',
                            'Andy''s Dinosaur Adventures', 'Andy''s Aquatic Adventures', 'Balamory', '64 Zoo Lane'))
        ORDER BY title ASC 
        LIMIT 50
    """
  },
  {
    'id': 'calm_videos',
    'title': 'Graded Calm Videos (Lab Certified)',
    'badge': 'Lab Certified',
    'icon': 'shield-checkmark',
    'age': 'All',
    'query': """
        SELECT * FROM kids_media 
        WHERE media_type = 'video' 
          AND stimulation_label = 'calm'
        ORDER BY stimulation_score ASC, id ASC 
        LIMIT 50
    """
  },
  {
    'id': 'discovery',
    'title': 'Curious Animals & Nature',
    'badge': 'Gentle Discovery',
    'icon': 'leaf',
    'age': '3–8',
    'query': """
        SELECT * FROM kids_media 
        WHERE (
              (creator_publisher IN ('Nat Geo Kids') AND title NOT LIKE 'How To Draw%')
              OR title LIKE '%Animal%' OR title LIKE '%Ocean%' OR title LIKE '%Wild%' OR title LIKE '%Nature%'
              OR title IN ('Wild Kratts', 'Dinosaur Train', 'The Magic School Bus', 'Octonauts', 'Zoboomafoo')
          )
          AND creator_publisher NOT IN ('Art for Kids Hub')
          AND title NOT LIKE 'How To Draw%'
          AND media_type IN ('video', 'show')
        ORDER BY stimulation_score ASC, id ASC 
        LIMIT 50
    """
  },
  {
    'id': 'pop',
    'title': 'Clean Movement & Active Dance',
    'badge': 'Movement & Joy',
    'icon': 'radio',
    'age': '6–12',
    'query': """
        SELECT * FROM kids_media 
        WHERE media_type = 'music' 
          AND (creator_publisher = 'KIDZ BOP' OR creator_publisher = 'KIDZ BOP Kids' OR genre_category LIKE '%Pop%')
        ORDER BY id ASC 
        LIMIT 50
    """
  },
  {
    'id': 'big_kids',
    'title': 'Big Kids Animated Quests',
    'badge': 'Heroic Adventures',
    'icon': 'flash',
    'age': '6–9',
    'query': """
        SELECT * FROM kids_media 
        WHERE media_type = 'show' 
          AND (target_age_group = '6-9' 
               OR title IN ('Pokémon', 'Avatar: The Last Airbender', 'Spider-Man', 'Batman: The Animated Series', 
                            'Teen Titans', 'Kim Possible', 'Ben 10: Alien Force', 'Totally Spies!', 
                            'Justice League Unlimited', 'X-Men: Evolution', 'Transformers: Victory', 'Digimon Adventure:',
                            'Phineas and Ferb', 'DuckTales', 'Darkwing Duck', 'TaleSpin', 'My Life as a Teenage Robot', 'Cyberchase'))
        ORDER BY title ASC 
        LIMIT 50
    """
  },
  {
    'id': 'tweens',
    'title': 'Tween Classics & Live-Action',
    'badge': 'Iconic Laughs',
    'icon': 'star',
    'age': '8–12',
    'query': """
        SELECT * FROM kids_media 
        WHERE media_type = 'show' 
          AND (target_age_group = '8-12' 
               OR title IN ('iCarly', 'Hannah Montana', 'Wizards of Waverly Place', 'Good Luck Charlie', 
                            'That''s So Raven', 'Drake & Josh', 'The Suite Life of Zack and Cody', 
                            'Lizzie McGuire', 'Zoey 101', 'Victorious', 'Austin & Ally', 'Liv & Maddie',
                            'Girl Meets World', 'K.C. Undercover', 'JONAS', 'Sonny with a Chance',
                            'Even Stevens', 'Phil of the Future', 'Stuck in the Middle', 'Sydney to the Max',
                            'Unfabulous', 'The Haunted Hathaways'))
        ORDER BY title ASC 
        LIMIT 50
    """
  }
]

category_data = {}
for cat in categories:
    cursor.execute(cat['query'])
    rows = [dict(r) for r in cursor.fetchall()]
    category_data[cat['id']] = rows
    print(f"Extracted {len(rows):2d} for {cat['title']} ({cat['id']})")

# Default Calm Feed: strictly preschool & gentle items (Ages 0-5), no episodes
cursor.execute("""
    SELECT * FROM kids_media 
    WHERE media_type != 'episode' 
      AND stimulation_label = 'calm' 
      AND (target_age_group IN ('0-2', '1-4', '1-5', '2-6', '3-5', '3-8', 'All', 'Preschool') OR target_age_group IS NULL)
    ORDER BY stimulation_score ASC, id ASC 
    LIMIT 120
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
    'calmFeed': calm_feed
}

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(payload, f, ensure_ascii=False)

print(f"Clean export successfully saved to: {output_file}")
