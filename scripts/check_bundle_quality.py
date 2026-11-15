import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('constants/bundled_kids_media.json', 'r', encoding='utf-8') as f:
    bundle = json.load(f)

print("="*60)
print("APP BUNDLE DATA QUALITY (bundled_kids_media.json)")
print("="*60)

all_items = {}
for cat_id, items in bundle['categoryItems'].items():
    for item in items:
        all_items[item['id']] = item

total_bundled = len(all_items)
print(f"Total Unique Bundled Items: {total_bundled}")

has_desc = sum(1 for it in all_items.values() if it.get('description') and it.get('description').strip())
has_img = 0
for it in all_items.values():
    if it.get('metadata_json'):
        try:
            m = json.loads(it['metadata_json'])
            if m.get('image'):
                has_img += 1
                continue
        except:
            pass
    if it.get('platform_url') and 'youtube.com' in it['platform_url']:
        has_img += 1

has_stim = sum(1 for it in all_items.values() if it.get('stimulation_label'))
has_url = sum(1 for it in all_items.values() if it.get('platform_url'))

print(f"  - Playable URLs       : {has_url} / {total_bundled} ({has_url/total_bundled*100:.1f}%)")
print(f"  - Working Artwork     : {has_img} / {total_bundled} ({has_img/total_bundled*100:.1f}%)")
print(f"  - Descriptions        : {has_desc} / {total_bundled} ({has_desc/total_bundled*100:.1f}%)")
print(f"  - Stimulation Labeled : {has_stim} / {total_bundled} ({has_stim/total_bundled*100:.1f}%)")
