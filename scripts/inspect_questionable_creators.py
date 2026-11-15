import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

creators_to_check = [
    'Ben Simon a.k.a. Cartoon Man Central', 'RetroFunTV', 'Bratz', 'DC Kids',
    'Ben10Petya', "Asap Toastyy's Dubs", 'Shock to the Soundtrack', 'Triforcefilms'
]

print("=== INSPECTING QUESTIONABLE CREATORS IN VIDEOS & MUSIC ===")
for creator in creators_to_check:
    c.execute("SELECT id, title, creator_publisher, media_type, stimulation_score, stimulation_label FROM kids_media WHERE creator_publisher = ?", (creator,))
    rows = c.fetchall()
    print(f"\nCreator: {creator} ({len(rows)} items)")
    for r in rows[:8]:
        print(f"  [{r[0]}] \"{r[1]}\" | Type: {r[3]} | Stim: {r[5]} ({r[4]})")
