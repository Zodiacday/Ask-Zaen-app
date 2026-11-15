import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

golden_check = [
    'wiggles', 'bluey', 'daniel tiger', 'mister rogers', 'sarah & duck', 'tumble leaf',
    'little bear', 'franklin', 'kipper', 'pingu', 'peppa pig', 'octonauts', 'postman pat',
    'in the night garden', 'brambly hedge', 'thomas', 'winnie the pooh', 'bear in the big blue house',
    'rolie polie olie', 'out of the box', 'blue\'s clues', 'dora', 'oswald', 'max & ruby',
    'wonder pets', 'backyardigans', 'teletubbies', 'bob the builder', 'charlie and lola',
    'fireman sam', 'arthur', 'magic school bus', 'dragon tales', 'reading rainbow', 'zoboomafoo',
    'curious george', 'veggietales', 'sesame street', 'shaun the sheep', 'miffy'
]

print("=== CHECKING PRESENCE OF GOLDEN PRESCHOOL TITLES ===")
for g in golden_check:
    c.execute("SELECT id, title, creator_publisher FROM kids_media WHERE media_type='show' AND LOWER(title) LIKE ?", (f'%{g}%',))
    rows = c.fetchall()
    if rows:
        print(f"FOUND ({len(rows)}): {g.upper()} -> {[r[1] for r in rows[:3]]}")
    else:
        print(f"NOT FOUND: {g.upper()}")
