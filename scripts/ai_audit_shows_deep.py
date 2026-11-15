import sqlite3
import json
import io
import sys
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("="*70)
print("COMPREHENSIVE AI AUDIT - DETAILED ANOMALY & MISMATCH DETECTION")
print("="*70)

c.execute("SELECT id, title, creator_publisher, genre_category, target_age_group, description FROM kids_media WHERE media_type='show'")
shows = c.fetchall()
print(f"Total shows in database: {len(shows)}")

# Audit Category 1: Teen / High School / Adolescent Dramas
teen_patterns = [
    r'\bteenagers?\b', r'\bhigh school\b', r'\badolescen(ce|ts?)\b', r'\bpuberty\b',
    r'\bdating\b', r'\bboyfriend\b', r'\bgirlfriend\b', r'\bcrush(es)?\b',
    r'\bromance\b', r'\blove triangle\b', r'\bhooking up\b', r'\bsex\b', r'\bdrugs?\b',
    r'\balcohol\b', r'\bparty(ing)?\b', r'\bprom\b'
]
teen_regex = re.compile('|'.join(teen_patterns), re.IGNORECASE)

# Audit Category 2: Mature Anime / Shonen Combat
anime_patterns = [
    r'\bdragon ball\b', r'\bnaruto\b', r'\bbleach\b', r'\bone piece\b', r'\byu-gi-oh\b',
    r'\bdeath note\b', r'\battack on titan\b', r'\binuyasha\b', r'\bfullmetal\b',
    r'\bshonen\b', r'\bjojo\b', r'\bsword art\b', r'\btokyo ghoul\b', r'\bevangelion\b',
    r'\bgundam\b', r'\bsailor moon\b', r'\bfairy tail\b', r'\bdemon slayer\b',
    r'\bmy hero academia\b', r'\bhunter x hunter\b', r'\bcode geass\b'
]
anime_regex = re.compile('|'.join(anime_patterns), re.IGNORECASE)

# Audit Category 3: Horror / Nightmare / Spooky / Macabre Cartoons
horror_patterns = [
    r'\bnightmare\b', r'\bhorror\b', r'\bgruesome\b', r'\bcreepy\b', r'\bmacabre\b',
    r'\bspooky\b', r'\bghosts?\b', r'\bhaunted\b', r'\bmonsters?\b', r'\bzombies?\b',
    r'\bvampires?\b', r'\bwerewol(f|ves)\b', r'\bdemon\b', r'\bdevil\b', r'\bdeath\b',
    r'\bmurder\b', r'\bblood\b', r'\bcorpse\b', r'\bgrave(yard)?\b', r'\bgory\b'
]
horror_regex = re.compile('|'.join(horror_patterns), re.IGNORECASE)

# Audit Category 4: Combat Action / Military / Superhero Warfare
combat_patterns = [
    r'\bg\.i\. joe\b', r'\btransformers\b', r'\bpower rangers\b', r'\bteenage mutant ninja turtles\b',
    r'\bvoltron\b', r'\bbeyblade\b', r'\bbakugan\b', r'\bhe-man\b', r'\bthundercats\b',
    r'\bjustice league\b', r'\bbatman\b', r'\bsuperman\b', r'\bx-men\b', r'\bspider-man\b',
    r'\bavengers\b', r'\biron man\b', r'\bhulk\b', r'\bstar wars\b', r'\bwarriors?\b',
    r'\bweapons?\b', r'\bguns?\b', r'\bmartial arts\b', r'\bassassin\b', r'\bdestroy(ing)? the earth\b'
]
combat_regex = re.compile('|'.join(combat_patterns), re.IGNORECASE)

results = {
    'teen': [],
    'mature_anime': [],
    'horror_spooky': [],
    'combat_action': [],
    'foreign_broadcast': []
}

# Foreign networks that might have adult content mislabeled as children
foreign_check_nets = {'ЦТ СССР', 'КиноПоиск', 'KBS2', 'MBC', 'SBS', 'KBS1', 'CCTV-8', 'Tencent QQ', 'iQIYI'}

for s in shows:
    s_id, title, net, genres, age, desc = s
    full_text = f"{title or ''} {desc or ''} {genres or ''}"

    # Check Anime
    if anime_regex.search(full_text):
        results['mature_anime'].append((s, "Mature/Shonen Anime"))
        continue

    # Check Combat Action
    if combat_regex.search(full_text):
        results['combat_action'].append((s, "Combat/Action/Superheroes"))
        continue

    # Check Horror / Spooky
    if horror_regex.search(full_text):
        # Exclude gentle friendly monsters like Sesame Street's Cookie Monster or Monsters Inc or friendly Halloween
        if not re.search(r'\b(sesame street|elmo|cookie monster|friendly monster)\b', full_text, re.IGNORECASE):
            results['horror_spooky'].append((s, "Horror/Nightmare/Monster"))
            continue

    # Check Teen / Dating / High School
    if teen_regex.search(full_text):
        results['teen'].append((s, "Teen/High School/Adolescent"))
        continue

    # Check Foreign broadcast networks
    if net in foreign_check_nets and ('Children' not in (genres or '')):
        results['foreign_broadcast'].append((s, f"Foreign broadcast network without Children: {net}"))

print(f"\n1. Teen / High School / Dating Shows Found: {len(results['teen'])}")
for s, reason in results['teen'][:20]:
    print(f"   [{s[0]}] \"{s[1]}\" | {s[2]} | {s[3]} | Desc: {(s[5] or '')[:70]}...")

print(f"\n2. Mature / Shonen Anime Found: {len(results['mature_anime'])}")
for s, reason in results['mature_anime'][:20]:
    print(f"   [{s[0]}] \"{s[1]}\" | {s[2]} | {s[3]} | Desc: {(s[5] or '')[:70]}...")

print(f"\n3. Horror / Nightmare / Spooky Shows Found: {len(results['horror_spooky'])}")
for s, reason in results['horror_spooky'][:20]:
    print(f"   [{s[0]}] \"{s[1]}\" | {s[2]} | {s[3]} | Desc: {(s[5] or '')[:70]}...")

print(f"\n4. Intense Combat / Action / Superhero Shows Found: {len(results['combat_action'])}")
for s, reason in results['combat_action'][:20]:
    print(f"   [{s[0]}] \"{s[1]}\" | {s[2]} | {s[3]} | Desc: {(s[5] or '')[:70]}...")

print(f"\n5. Foreign Broadcast Unverified Shows: {len(results['foreign_broadcast'])}")
for s, reason in results['foreign_broadcast'][:20]:
    print(f"   [{s[0]}] \"{s[1]}\" | {s[2]} | {s[3]}")
