import sqlite3
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conn = sqlite3.connect(r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db')
c = conn.cursor()

def test_query(name, query):
    c.execute(query)
    rows = c.fetchall()
    print(f"\n✅ {name}: {len(rows)} items")
    for r in rows[:4]:
        print(f"   [{r[0]}] {r[1]} | Pub: {r[2]} | Age: {r[3]}")

# 1. Pure Bedtime
test_query("BEDTIME & SLEEP", """
    SELECT id, title, creator_publisher, target_age_group FROM kids_media 
    WHERE media_type = 'music' 
      AND (genre_category LIKE '%Lullaby%' OR genre_category LIKE '%Sleep%' OR genre_category LIKE '%Bedtime%'
           OR title LIKE '%Lullaby%' OR title LIKE '%Sleep%' OR title LIKE '%Brahms%' OR title LIKE '%Mozart%')
      AND title NOT LIKE '%KIDZ BOP%'
    ORDER BY stimulation_score ASC, id ASC 
    LIMIT 50
""")

# 2. Pure Toddler Nursery (0-4 strictly, no pop)
test_query("TODDLER NURSERY", """
    SELECT id, title, creator_publisher, target_age_group FROM kids_media 
    WHERE media_type = 'music' 
      AND (creator_publisher IN ('Super Simple Songs', 'The Wiggles', 'Cocomelon', 'Sesame Street', 'Teletubbies - WildBrain')
           OR genre_category LIKE '%Nursery%' OR genre_category LIKE '%Toddler%')
      AND (target_age_group IN ('0-2', '1-4', '1-5', '2-6', '3-5') OR target_age_group IS NULL)
      AND creator_publisher NOT IN ('KIDZ BOP', 'KIDZ BOP Kids')
      AND title NOT LIKE '%KIDZ BOP%'
    ORDER BY stimulation_score ASC, id ASC 
    LIMIT 50
""")

# 3. Pure Phonics & ABCs
test_query("PHONICS & EARLY ABCS", """
    SELECT id, title, creator_publisher, target_age_group FROM kids_media 
    WHERE (genre_category LIKE '%Phonics%' OR title LIKE '%Alphabet%' OR title LIKE '%ABC%' OR title LIKE '%Phonics%' OR creator_publisher IN ('Alphablocks', 'Numberblocks'))
      AND media_type IN ('music', 'video')
      AND creator_publisher NOT IN ('KIDZ BOP', 'KIDZ BOP Kids')
    ORDER BY id ASC 
    LIMIT 50
""")

# 4. Pure Nick Jr. Preschool (Exclude teen sitcoms)
test_query("NICK JR. GENTLE PRESCHOOL", """
    SELECT id, title, creator_publisher, target_age_group FROM kids_media 
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
      AND title NOT IN ('100 Things to Do Before High School', '100 Deeds for Eddie McDowd', 'Aaahh!!! Real Monsters', '3 Friends and Jerry', 'All That', 'Deadtime Stories')
    ORDER BY title ASC 
    LIMIT 50
""")

# 5. Pure CBeebies (Exclude CBBC)
test_query("CBEEBIES STORYTELLING", """
    SELECT id, title, creator_publisher, target_age_group FROM kids_media 
    WHERE media_type = 'show' 
      AND (creator_publisher = 'CBeebies' 
           OR title IN ('Teletubbies', 'In the Night Garden', 'Sarah & Duck', 'Hey Duggee', 'Charlie and Lola', 'Bing', 'Postman Pat', 'Bob the Builder'))
    ORDER BY title ASC 
    LIMIT 50
""")

# 6. Pure Disney Junior (Exclude teen Disney sitcoms)
test_query("DISNEY JUNIOR GENTLE TALES", """
    SELECT id, title, creator_publisher, target_age_group FROM kids_media 
    WHERE media_type = 'show' 
      AND (
          creator_publisher = 'Disney Junior' 
          OR title IN ('Sofia the First', 'Little Einsteins', 'Handy Manny', 'Rolie Polie Olie', 
                       'Out of the Box', 'PB&J Otter', 'Playdate with Winnie the Pooh', 'The Book of Pooh', 
                       'Welcome to Pooh Corner', 'Muppet Babies', 'Pupstruction', 'Spidey and His Amazing Friends', 
                       'Special Agent Oso', 'Doc McStuffins', 'Sheriff Callie''s Wild West', 'Stanley', 'Higglytown Heroes')
      )
      AND title NOT IN ('Hannah Montana', 'Wizards of Waverly Place', 'Lizzie McGuire', 'That''s So Raven', 'Good Luck Charlie', 'Liv & Maddie', 'Austin & Ally', 'Girl Meets World')
    ORDER BY title ASC 
    LIMIT 50
""")

# 7. Pure PBS Kids Preschool Sanctuary
test_query("PBS KIDS SANCTUARY", """
    SELECT id, title, creator_publisher, target_age_group FROM kids_media 
    WHERE media_type = 'show' 
      AND (
          creator_publisher = 'PBS Kids' 
          OR title IN ('Mister Rogers'' Neighborhood', 'Daniel Tiger''s Neighborhood', 'Arthur', 'Clifford the Big Red Dog', 
                       'Dragon Tales', 'Peg + Cat', 'Reading Rainbow', 'Donkey Hodie', 'Elinor Wonders Why', 
                       'Alma''s Way', 'Sesame Street', 'Molly of Denali', 'Rosie''s Rules', 'Curious George', 'Nature Cat')
      )
    ORDER BY title ASC 
    LIMIT 50
""")

# 8. Pure Nature & Animals (No drawing tutorials)
test_query("CURIOUS ANIMALS & NATURE", """
    SELECT id, title, creator_publisher, target_age_group FROM kids_media 
    WHERE (
          (creator_publisher IN ('Nat Geo Kids') AND title NOT LIKE 'How To Draw%')
          OR title LIKE '%Animal%' OR title LIKE '%Ocean%' OR title LIKE '%Wild%' OR title LIKE '%Nature%' OR title LIKE '%Planet%'
          OR title IN ('Wild Kratts', 'Dinosaur Train', 'The Magic School Bus', 'Octonauts', 'Zoboomafoo')
      )
      AND creator_publisher NOT IN ('Art for Kids Hub')
      AND title NOT LIKE 'How To Draw%'
      AND media_type IN ('video', 'show')
    ORDER BY stimulation_score ASC, id ASC 
    LIMIT 50
""")

