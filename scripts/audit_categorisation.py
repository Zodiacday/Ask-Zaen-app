import json
import io
import sys
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('constants/bundled_kids_media.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("="*80)
print("DEEP CATEGORISATION AUDIT")
print("="*80)

categories = data['categories']
items_by_cat = data['categoryItems']

for cat in categories:
    cid = cat['id']
    items = items_by_cat.get(cid, [])
    print(f"\n📂 CATEGORY: '{cat['title']}' (id: {cid}, age: {cat['age']}, count: {len(items)})")
    
    # Check media types
    media_types = Counter(it.get('media_type') for it in items)
    print(f"   Media types: {dict(media_types)}")
    
    # Check target age groups
    age_groups = Counter(it.get('target_age_group') for it in items)
    print(f"   Age groups: {dict(age_groups)}")
    
    # Check publishers/creators
    creators = Counter(it.get('creator_publisher') for it in items)
    top_creators = creators.most_common(5)
    print(f"   Top publishers: {top_creators}")
    
    # Check sample titles
    print("   Sample titles:")
    for it in items[:6]:
        print(f"     - [{it.get('id')}] {it.get('title')} (Age: {it.get('target_age_group')}, Type: {it.get('media_type')})")
