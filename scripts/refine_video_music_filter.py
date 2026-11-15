import sqlite3
import json
import io
import sys
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

# Strictly junk / inappropriate patterns
# Note: We use word boundaries and avoid phrases like "creepy crawly"
bad_patterns = [
    # Explicit violence / horror / fear
    r'\bdeath\b', r'\bdead(?!\s+adder)\b', r'\bdies?\b', r'\bkills?\b', r'\bkiller\b', r'\bmurder\b',
    r'\bblood\b', r'\bhorror\b', r'\bcreepy(?! crawly)\b', r'\bcreepypasta\b',
    r'\bscary(?! villains| stories)\b', r'\bcursed\b', r'\b\.exe\b', r'\bdemon\b', r'\bdevil\b',
    r'\bsuicide\b', r'\bgore\b', r'\bweapons?\b',
    # Brainrot & Gaming UGC
    r'\bskibidi\b', r'\bhuggy\b', r'\bpoppy playtime\b', r'\bfnf\b', r'\bfriday night funkin\b',
    r'\bgta\b', r'\bgrand theft auto\b', r'\broblox\b', r'\bamong us\b',
    # Video game walkthroughs / speedruns
    r'\bplaythrough\b', r'\bwalkthrough\b', r'\bgameplay\b', r'\bspeedrun\b', r'\bno death\b',
    # Shorts / TikTok / Clickbait UGC
    r'#shorts\b', r'\b#short\b', r'\btiktok\b', r'\bprank\b', r'\bexposed\b', r'\breaction\b',
    r'\bfull vhs\b', r'\bvhs rip\b', r'\bbanned\b', r'\blast episode\b', r'\bglitch\b'
]
bad_regex = re.compile('|'.join(bad_patterns), re.IGNORECASE)

c.execute("SELECT id, title, creator_publisher, media_type, stimulation_label FROM kids_media WHERE media_type IN ('video', 'music')")
items = c.fetchall()

junk = []
for item in items:
    m_id, title, creator, mtype, stim = item
    t = title or ''
    m = bad_regex.search(t)
    if m:
        junk.append((item, m.group(0)))

print(f"Total video/music scanned: {len(items)}")
print(f"Total junk/weird items identified: {len(junk)}")
print("\nSample flagged items (first 40):")
for item, match in junk[:40]:
    print(f"  [{item[0]}] ({match}) \"{item[1]}\" | {item[2]} | {item[3]}")
