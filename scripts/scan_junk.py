import sqlite3
import json

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("=== 1. CHECKING SHOWS WITH SUSPICIOUS GENRES ===")
suspicious_show_genres = ['Horror', 'Crime', 'Thriller', 'War', 'Romance', 'Reality', 'Talk-Show', 'Soap', 'Erotic', 'Mystery']
for g in suspicious_show_genres:
    c.execute("SELECT id, title, creator_publisher, genre_category FROM kids_media WHERE media_type = 'show' AND genre_category LIKE ?", (f'%{g}%',))
    rows = c.fetchall()
    print(f"\nShows with genre '{g}' ({len(rows)} found):")
    for r in rows[:10]:
        print(f"  [{r[0]}] {r[1]} | {r[2]} | {r[3]}")

print("\n=== 2. CHECKING VIDEOS / UGC WITH WEIRD TITLES ===")
bad_title_patterns = [
    '%death%', '%kill%', '%scary%', '%horror%', '%creepy%', '%blood%', 
    '%fart%', '%poop%', '%skibidi%', '%toilet%', '%huggy%', '%poppy%',
    '%fnf%', '%friday night funkin%', '%exe%', '%creepypasta%', '%banned%',
    '%crying%', '%sad%', '%screaming%', '%prank%', '%last episode%', '%reaction%',
    '%exposed%', '%unboxing%', '%challenge%', '%among us%', '%roblox%', '%gta%'
]

for pat in bad_title_patterns:
    clean_p = pat.replace('%', '')
    c.execute("SELECT COUNT(*) FROM kids_media WHERE media_type IN ('video', 'music', 'show') AND LOWER(title) LIKE ?", (pat,))
    cnt = c.fetchone()[0]
    if cnt > 0:
        c.execute("SELECT id, title, creator_publisher, media_type, stimulation_label FROM kids_media WHERE media_type IN ('video', 'music', 'show') AND LOWER(title) LIKE ? LIMIT 3", (pat,))
        samples = c.fetchall()
        print(f"\nKeyword [{clean_p}]: {cnt} matches")
        for s in samples:
            print(f"  [{s[0]}] \"{s[1]}\" | {s[2]} | {s[3]} | stim={s[4]}")
