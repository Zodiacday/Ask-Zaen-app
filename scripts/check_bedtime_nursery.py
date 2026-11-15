import json
import io
import sys
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('constants/bundled_kids_media.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for cid in ['bedtime', 'nursery']:
    items = data['categoryItems'][cid]
    print(f"\n📂 {cid.upper()}: count={len(items)}")
    print("   Age groups:", Counter(it.get('target_age_group') for it in items))
    print("   Media types:", Counter(it.get('media_type') for it in items))
    print("   Top publishers:", Counter(it.get('creator_publisher') for it in items).most_common(5))
    print("   Sample titles:")
    for it in items[:6]:
        print(f"     - [{it.get('id')}] {it.get('title')} (Age: {it.get('target_age_group')})")
