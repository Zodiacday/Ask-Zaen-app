import sqlite3
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db'
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
c = conn.cursor()

print("=" * 80)
print("100% SENSORY ENGINE AUDIT & DATABASE VERIFICATION REPORT")
print("=" * 80)

# Total count
c.execute("SELECT count(*) FROM kids_media")
total = c.fetchone()[0]

# Total with stimulation score
c.execute("SELECT count(*) FROM kids_media WHERE stimulation_score IS NOT NULL")
graded = c.fetchone()[0]

print(f"Total Database Records : {total:,}")
print(f"Total Graded Items     : {graded:,} ({graded/total*100:.1f}%)")
print(f"Ungraded Items         : {total - graded:,}\n")

# By Media Type
print("-" * 80)
print("BREAKDOWN BY MEDIA TYPE:")
c.execute("""
    SELECT media_type, count(*), 
           round(avg(stimulation_score), 1) as avg_score,
           min(stimulation_score) as min_s,
           max(stimulation_score) as max_s
    FROM kids_media 
    GROUP BY media_type
    ORDER BY count(*) DESC
""")
for r in c.fetchall():
    print(f"  • {r['media_type']:<10}: {r[1]:>7,} records | Avg Score: {r['avg_score']:>4.1f}/100 | Range: [{r['min_s']} - {r['max_s']}]")

# By Sensory Tier
print("\n" + "-" * 80)
print("BREAKDOWN BY SENSORY CLASSIFICATION TIER:")
c.execute("""
    SELECT stimulation_label, count(*),
           round(count(*) * 100.0 / (SELECT count(*) FROM kids_media), 1) as pct,
           round(avg(stimulation_score), 1) as avg_score
    FROM kids_media
    GROUP BY stimulation_label
    ORDER BY count(*) DESC
""")
for r in c.fetchall():
    lbl = r['stimulation_label']
    tier_desc = "Calm Sanctuary (<= 30)" if lbl == 'calm' else "Moderate Active (31-60)" if lbl == 'moderate' else "High Stimulation (> 60)"
    print(f"  • {lbl.upper():<9} ({tier_desc:<25}): {r[1]:>7,} records ({r['pct']:>5.1f}%) | Avg Score: {r['avg_score']}/100")

# Sample sensory profile extraction from metadata_json
print("\n" + "-" * 80)
print("AUDIT OF NEURO-SENSORY SIGNALS & METADATA_JSON (Sample Check across 74,765):")
c.execute("SELECT count(*) FROM kids_media WHERE metadata_json LIKE '%sensory_profile%'")
has_sensory_meta = c.fetchone()[0]
print(f"Records with full 5-signal 'sensory_profile' JSON: {has_sensory_meta:,} ({has_sensory_meta/total*100:.1f}%)\n")

# Distribution of Recommended Routines
c.execute("""
    SELECT safety_rating_tags, count(*)
    FROM kids_media
    WHERE media_type != 'episode'
    GROUP BY safety_rating_tags
    ORDER BY count(*) DESC
    LIMIT 10
""")
print("TOP CATALOG ROUTINE TAGS:")
for r in c.fetchall():
    tag = r[0] if r[0] else 'None'
    print(f"  • {tag:<60} : {r[1]:>5,} items")

# Concrete Examples
print("\n" + "-" * 80)
print("CONCRETE SENSORY PROFILE SAMPLES FROM DATABASE:")

samples = [
    ('Twinkle Twinkle Little Star (Lullaby)', 'music'),
    ('Mister Rogers\' Neighborhood', 'show'),
    ('The Magic School Bus', 'show'),
    ('Hannah Montana', 'show'),
    ('Dragon Ball Z', 'show'),
    ('Avatar: The Last Airbender', 'show'),
]

for title, mtype in samples:
    c.execute("SELECT id, title, media_type, target_age_group, stimulation_score, stimulation_label, safety_rating_tags, metadata_json FROM kids_media WHERE title LIKE ? AND media_type = ? LIMIT 1", (f"%{title}%", mtype))
    row = c.fetchone()
    if row:
        meta = json.loads(row['metadata_json']) if row['metadata_json'] else {}
        sp = meta.get('sensory_profile', {})
        print(f"\nItem: {row['title']} [{row['media_type'].upper()}] - Age: {row['target_age_group']}")
        print(f"  Score: {row['stimulation_score']}/100 ({row['stimulation_label'].upper()}) | Cuts/min: {sp.get('cuts_per_minute', 'N/A')}")
        print(f"  Routine: {sp.get('recommended_routine', 'N/A')} ({row['safety_rating_tags']})")
        print(f"  Advisory: {sp.get('parent_advisory', 'N/A')}")
        print(f"  5 Signals: Visual={sp.get('visual_pace')} | Sound={sp.get('sound_intensity')} | Story={sp.get('narrative_pressure')} | Emotion={sp.get('emotional_arousal')} | Reward={sp.get('reward_pressure')}")

conn.close()
