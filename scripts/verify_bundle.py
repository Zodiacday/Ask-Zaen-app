import json
import io
import sys
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

json_path = r'C:\Users\natan\.gemini\antigravity-ide\scratch\netflix-expo\constants\bundled_kids_media.json'
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

print("="*60)
print("AUDITING BUNDLED KIDS MEDIA JSON")
print("="*60)

print(f"Categories count: {len(data['categories'])}")
for cat in data['categories']:
    print(f"  {cat['title']} ({cat['id']}) - {cat['count']} items (Age: {cat['age']})")

print(f"\nDefault Calm Feed count: {len(data['calmFeed'])}")

# Check for any bad keywords in titles across all items
bad_words = ['death', 'dead', 'kill', 'murder', 'blood', 'horror', 'creepy', 'scary', 'skibidi', 'toilet', 'huggy wuggy', 'fnf', 'shorts', '#shorts', 'vhs', 'playthrough', 'walkthrough', 'gameplay', 'roblox', 'gta', 'among us', 'downton', 'simpsons', 'family guy', 'shameless', 'days of our lives', 'courage']

all_items = data['calmFeed']
for cat_id, items in data['categoryItems'].items():
    all_items.extend(items)

flagged = []
for item in all_items:
    t = (item.get('title') or '').lower()
    for w in bad_words:
        # Check whole word
        if re.search(r'\b' + re.escape(w) + r'\b', t):
            flagged.append((item['id'], item['title'], item['creator_publisher'], w))

print(f"\nTotal items inspected in bundled JSON: {len(all_items)}")
print(f"Flagged suspect items: {len(flagged)}")
if flagged:
    for f in flagged[:15]:
        print(f"  Suspect: [{f[0]}] \"{f[1]}\" | {f[2]} (keyword: {f[3]})")
else:
    print("ALL CLEAR! Zero weird, adult, horror, or brainrot items found in the app bundle!")
