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
print("AUDITING VIDEOS & MUSIC (7,952 videos, 4,814 music tracks)")
print("="*60)

# 1. Unplayable videos
c.execute("SELECT count(*) FROM kids_media WHERE media_type IN ('video', 'music') AND stimulation_label = 'unplayable'")
print(f"1. Dead/Unplayable items: {c.fetchone()[0]}")

# 2. Suspicious keywords in Video/Music titles
# Regex patterns targeting brainrot, clickbait, violence, fear, fan reuploads
bad_title_patterns = [
    # Violence, Death, Weapons
    r'\bdeath\b', r'\bdead\b', r'\bdies?\b', r'\bkills?\b', r'\bkiller\b', r'\bmurder\b',
    r'\bblood\b', r'\bgun\b', r'\bguns\b', r'\bshoot\b', r'\bshooting\b', r'\bweapons?\b',
    r'\bsuicide\b', r'\bdemon\b', r'\bdevil\b', r'\bgore\b', r'\bzombie\b',
    # Fear, Creepypasta, Horror
    r'\bhorror\b', r'\bcreepy\b', r'\bscary\b', r'\bcreepypasta\b', r'\bcursed\b', r'\b\.exe\b',
    # Brainrot / Memes / Non-preschool gaming UGC
    r'\bskibidi\b', r'\btoilet\b(?!\s+(?:song|potty|training))', # allow "toilet song" or "toilet training" for toddlers
    r'\bhuggy\b', r'\bpoppy playtime\b', r'\bfnf\b', r'\bfriday night funkin\b',
    r'\bgta\b', r'\bgrand theft auto\b', r'\bamong us\b', r'\broblox\b',
    # Clickbait / Low quality UGC tags
    r'#shorts\b', r'\btiktok\b', r'\bprank\b', r'\bexposed\b', r'\breaction\b',
    r'\bfull vhs\b', r'\bplaythrough\b', r'\bwalkthrough\b', r'\bgameplay\b',
    r'\bbanned\b', r'\blast episode\b', r'\bglitch\b', r'\bunboxing\b'
]
bad_regex = re.compile('|'.join(bad_title_patterns), re.IGNORECASE)

c.execute("SELECT id, title, creator_publisher, media_type, stimulation_label FROM kids_media WHERE media_type IN ('video', 'music')")
items = c.fetchall()

flagged_items = []
clean_items = []
for item in items:
    m_id, title, creator, mtype, stim = item
    if stim == 'unplayable':
        flagged_items.append((item, "Unplayable / Broken"))
        continue
    m = bad_regex.search(title or '')
    if m:
        flagged_items.append((item, f"Keyword match: '{m.group(0)}'"))
    else:
        clean_items.append(item)

print(f"2. Total Video & Music items evaluated: {len(items)}")
print(f"   Clean / Safe items: {len(clean_items)}")
print(f"   Flagged weird/junk/dead items: {len(flagged_items)}")

print("\nSample flagged items (first 35):")
for item, reason in flagged_items[:35]:
    print(f"  [{item[0]}] \"{item[1]}\" | {item[2]} | {item[3]} --> {reason}")
