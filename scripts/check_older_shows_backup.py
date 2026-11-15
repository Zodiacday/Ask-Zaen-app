import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

backup_db = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.backup.db'
conn = sqlite3.connect(backup_db)
c = conn.cursor()

big_kids_titles = [
    'Pokémon', 'Avatar: The Last Airbender', 'Spider-Man', 'Batman: The Animated Series',
    'Teen Titans', 'Ben 10', 'Totally Spies!', 'Kim Possible', 'Justice League Unlimited',
    'X-Men: Evolution', 'Transformers', 'Digimon Adventure:'
]

tween_titles = [
    'iCarly', 'Hannah Montana', 'Wizards of Waverly Place', 'Good Luck Charlie',
    'That\'s So Raven', 'Drake & Josh', 'The Suite Life of Zack and Cody',
    'Lizzie McGuire', 'Zoey 101', 'Victorious', 'Austin & Ally', 'Liv & Maddie'
]

print("=== CHECKING BIG KIDS TITLES IN BACKUP DB ===")
for t in big_kids_titles:
    c.execute("SELECT id, title, creator_publisher, genre_category, target_age_group FROM kids_media WHERE media_type='show' AND LOWER(title) LIKE ?", (f'%{t.lower()}%',))
    rows = c.fetchall()
    print(f"[{t}]: {len(rows)} matches -> {[(r[0], r[1], r[2]) for r in rows[:2]]}")

print("\n=== CHECKING TWEEN TITLES IN BACKUP DB ===")
for t in tween_titles:
    c.execute("SELECT id, title, creator_publisher, genre_category, target_age_group FROM kids_media WHERE media_type='show' AND LOWER(title) LIKE ?", (f'%{t.lower()}%',))
    rows = c.fetchall()
    print(f"[{t}]: {len(rows)} matches -> {[(r[0], r[1], r[2]) for r in rows[:2]]}")
