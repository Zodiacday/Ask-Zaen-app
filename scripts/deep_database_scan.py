import sqlite3
import json
import io
import sys
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("="*60)
print("DEEP AUDIT OF 'kids_media.db' FOR WEIRD / INAPPROPRIATE CONTENT")
print("="*60)

# 1. Shows with Adult Genres or Adult Content
c.execute("""
    SELECT id, title, creator_publisher, genre_category 
    FROM kids_media 
    WHERE media_type='show' AND (
        genre_category LIKE '%Horror%' 
        OR genre_category LIKE '%Crime%' 
        OR genre_category LIKE '%Thriller%' 
        OR genre_category LIKE '%War%' 
        OR genre_category LIKE '%Romance%' 
        OR genre_category LIKE '%Legal%' 
        OR genre_category LIKE '%Medical%'
    )
""")
adult_genre_shows = c.fetchall()
print(f"\n1. Shows with Adult/Inappropriate Genres (Horror/Crime/Thriller/War/Romance/Legal/Medical): {len(adult_genre_shows)}")
for s in adult_genre_shows[:15]:
    print(f"   [{s[0]}] {s[1]} | {s[2]} | {s[3]}")

# 2. Adult Prime-Time Sitcoms / Dramas that were imported because of TVMaze 'Family' tag
adult_titles = [
    'Family Guy', 'The Simpsons', 'Bob\'s Burgers', 'American Dad!', 'Shameless', 
    'Two and a Half Men', 'Mom', 'Bad Judge', 'Parenthood', 'Modern Family', 
    'The Goldbergs', 'The Middle', 'Last Man Standing', 'Downton Abbey', 
    'Days of Our Lives', 'The Bold and the Beautiful', 'Dallas', 'Army Wives', 
    'The Fosters', 'Dancing with the Stars', 'The Amazing Race', 'Arrested Development',
    'Mike & Molly', 'Switched at Birth', 'Black-ish', 'Everwood', 'One Tree Hill',
    'Dharma & Greg', 'Brothers & Sisters', 'My Generation', 'Kingdom', 'Being Mary Jane',
    'Cougar Town', 'Californication', 'Desperate Housewives', 'Grey\'s Anatomy', 'Glee'
]
c.execute("SELECT id, title, creator_publisher, genre_category FROM kids_media WHERE media_type='show'")
all_shows = c.fetchall()
matched_adult_shows = []
for s in all_shows:
    for at in adult_titles:
        if at.lower() == s[1].strip().lower():
            matched_adult_shows.append(s)
            break
print(f"\n2. Prime-Time Adult Sitcoms/Soaps/Dramas identified by known title: {len(matched_adult_shows)}")
for s in matched_adult_shows[:15]:
    print(f"   [{s[0]}] {s[1]} | {s[2]} | {s[3]}")

# 3. Shows without ANY 'Children' genre tag
c.execute("""
    SELECT count(*) FROM kids_media 
    WHERE media_type='show' 
      AND (genre_category NOT LIKE '%Children%' OR genre_category IS NULL)
""")
non_children_shows_count = c.fetchone()[0]
print(f"\n3. Total Shows without 'Children' tag: {non_children_shows_count} (out of {len(all_shows)} total shows)")

# 4. Videos with 'unplayable' stimulation_label
c.execute("SELECT count(*) FROM kids_media WHERE media_type='video' AND stimulation_label='unplayable'")
unplayable_videos = c.fetchone()[0]
print(f"\n4. Videos tagged 'unplayable' (dead links/geo-blocked): {unplayable_videos}")

# 5. YouTube UGC Junk / Brainrot / Inappropriate Keywords in Videos and Music
bad_patterns = [
    r'\bdeath\b', r'\bdie\b', r'\bdies\b', r'\bdead\b', r'\bkills?\b', r'\bkiller\b', 
    r'\bmurder\b', r'\bblood\b', r'\bhorror\b', r'\bcreepy\b', r'\bscary\b', 
    r'\bfart\b', r'\bpoop\b', r'\bskibidi\b', r'\btoilet\b', r'\bhuggy\b', 
    r'\bpoppy playtime\b', r'\bfnf\b', r'\bfriday night funkin\b', r'\bcreepypasta\b', 
    r'\bbanned\b', r'\bexe\b', r'\bcursed\b', r'#shorts\b', r'\bshorts\b', 
    r'\btiktok\b', r'\bprank\b', r'\bexposed\b', r'\breaction\b', r'\bfull vhs\b', 
    r'\bplaythrough\b', r'\bwalkthrough\b', r'\bgameplay\b', r'\bglitch\b', 
    r'\bgta\b', r'\broblox\b', r'\bamong us\b', r'\bgun\b', r'\bguns\b', 
    r'\bshoot\b', r'\bshooting\b', r'\bsuicide\b', r'\bdemon\b', r'\bdevil\b',
    r'\bgore\b', r'\bweapons?\b', r'\bfight(ing)?\b', r'\bwar\b', r'\bzombie\b'
]
combined_regex = re.compile('|'.join(bad_patterns), re.IGNORECASE)

c.execute("SELECT id, title, creator_publisher, media_type, stimulation_label FROM kids_media WHERE media_type IN ('video', 'music')")
ugc_media = c.fetchall()
weird_ugc = []
for m in ugc_media:
    m_id, title, creator, mtype, stim = m
    if combined_regex.search(title or ''):
        weird_ugc.append(m)

print(f"\n5. Videos/Music with Brainrot / UGC / Inappropriate Keywords: {len(weird_ugc)} (out of {len(ugc_media)})")
for m in weird_ugc[:25]:
    print(f"   [{m[0]}] \"{m[1]}\" | {m[2]} | {m[3]} | stim={m[4]}")

# 6. Check Episodes belonging to suspect shows
print("\n6. Checking associated episodes...")
adult_show_ids = [s[0] for s in adult_genre_shows] + [s[0] for s in matched_adult_shows]
adult_show_ids = list(set(adult_show_ids))
c.execute("SELECT count(*) FROM kids_media WHERE media_type='episode' AND parent_show_id IN ({})".format(','.join(['?']*len(adult_show_ids))), adult_show_ids)
suspect_episodes_count = c.fetchone()[0]
print(f"   Episodes belonging to adult/inappropriate shows: {suspect_episodes_count:,}")
