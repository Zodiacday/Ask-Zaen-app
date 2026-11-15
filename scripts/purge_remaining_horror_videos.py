import sqlite3
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

adult_video_keywords = [
    '%courage the cowardly dog%', '%courage cowardly%', '%young dracula%', 
    '%murderland%', '%death of dora%', '%creepypasta%', '%poppy playtime%',
    '%huggy wuggy%', '%skibidi toilet%', '%happy tree friends%'
]

print("=== CHECKING FOR REMAINING HORROR / WEIRD VIDEOS ===")
purged_count = 0
for kw in adult_video_keywords:
    c.execute("SELECT id, title, creator_publisher FROM kids_media WHERE LOWER(title) LIKE ?", (kw,))
    matches = c.fetchall()
    if matches:
        print(f"Keyword '{kw}': {len(matches)} matches")
        for m in matches:
            print(f"  Deleting [{m[0]}] {m[1]} | {m[2]}")
            c.execute("DELETE FROM kids_media WHERE id = ?", (m[0],))
            purged_count += 1

conn.commit()
print(f"\nPurged {purged_count} remaining horror/weird videos from database.")
