import sqlite3
import json
import io
import sys

# Force UTF-8 output to avoid Windows console errors
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("--- 1. SHOWS THAT ARE NOT FOR KIDS (DRAMA / SOAP / CRIME / ADULT) ---")
# Query shows where genres include Drama, Romance, Crime, Thriller, War or from adult networks
c.execute("""
    SELECT id, title, creator_publisher, genre_category 
    FROM kids_media 
    WHERE media_type = 'show' 
      AND (genre_category LIKE '%Romance%' 
           OR genre_category LIKE '%Crime%' 
           OR genre_category LIKE '%Thriller%' 
           OR genre_category LIKE '%War%' 
           OR genre_category LIKE '%Horror%')
""")
suspect_shows = c.fetchall()
print(f"Total suspect adult/soap shows: {len(suspect_shows)}")
for r in suspect_shows[:20]:
    print(f"  [{r[0]}] {r[1]} | {r[2]} | {r[3]}")

print("\n--- 2. YOUTUBE UGC / WEIRD TITLES IN VIDEOS & MUSIC ---")
bad_words = [
    'death', 'scary', 'horror', 'creepy', 'kill', 'murder', 'blood', 
    'fart', 'poop', 'skibidi', 'toilet', 'huggy', 'poppy playtime',
    'fnf', 'creepypasta', 'banned', 'crying', 'sad', 'screaming', 
    'prank', 'last episode', 'reaction', 'exposed', 'unboxing', 
    'among us', 'roblox', 'gta', 'tiktok', 'shorts', '#shorts', 
    'vhs', 'full vhs', 'glitch', 'exe', 'cursed'
]

junk_items = []
for w in bad_words:
    c.execute("SELECT id, title, creator_publisher, media_type, stimulation_label FROM kids_media WHERE media_type IN ('video', 'music') AND LOWER(title) LIKE ?", (f'%{w}%',))
    matches = c.fetchall()
    for m in matches:
        junk_items.append((w, m))

print(f"Total weird/junk video & music items found by keywords: {len(junk_items)}")
seen = set()
for kw, item in junk_items[:35]:
    if item[0] not in seen:
        seen.add(item[0])
        print(f"  [{item[0]}] (keyword: {kw}) \"{item[1]}\" | {item[2]} | {item[3]} | stim={item[4]}")
