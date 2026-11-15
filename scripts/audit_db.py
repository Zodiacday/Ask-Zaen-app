import sqlite3

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("=== AUDITING SUSPICIOUS KEYWORDS IN KIDS_MEDIA.DB ===")
suspect_keywords = [
    'Horror', 'Thriller', 'Crime', 'War', 'Zombie', 'Death', 'Blood', 
    'Scary', 'Fight', 'Gun', 'Kill', 'Sex', 'Adult', 'Violence', 'Terror',
    'Dark', 'Monster', 'Chucky', 'Nightmare', 'Demon', 'Ghost'
]

for kw in suspect_keywords:
    c.execute("SELECT COUNT(id) FROM kids_media WHERE genre_category LIKE ? OR title LIKE ?", (f'%{kw}%', f'%{kw}%'))
    count = c.fetchone()[0]
    
    # Sample 2 titles if count > 0
    sample = []
    if count > 0:
        c.execute("SELECT title, creator_publisher, genre_category, media_type, stimulation_label FROM kids_media WHERE genre_category LIKE ? OR title LIKE ? LIMIT 2", (f'%{kw}%', f'%{kw}%'))
        sample = c.fetchall()

    print(f"[{kw}]: {count} matches")
    for s in sample:
        print(f"   -> \"{s[0]}\" | {s[1]} | Genre: {s[2]} | Type: {s[3]} | Stim: {s[4]}")

print("\n=== AUDITING DISCORD / NON-KIDS / POPULAR SLIPS ===")
c.execute("SELECT title, creator_publisher, genre_category, media_type FROM kids_media WHERE media_type = 'music' AND (genre_category LIKE '%Pop%' OR genre_category LIKE '%Rap%' OR genre_category LIKE '%Hip%') LIMIT 10")
for s in c.fetchall():
    print(f"   -> Pop/Music: \"{s[0]}\" by {s[1]} ({s[2]})")

print("\n=== AUDITING HIGH STIMULATION SLIPS IN CALM FEED ===")
c.execute("SELECT title, creator_publisher, stimulation_score, stimulation_label FROM kids_media WHERE stimulation_label = 'calm' AND (stimulation_score > 30 OR stimulation_score IS NULL) LIMIT 5")
for s in c.fetchall():
    print(f"   -> Calm with Score issue: \"{s[0]}\" | Score: {s[2]} | Label: {s[3]}")
