import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('constants/bundled_kids_media.json', 'r', encoding='utf-8') as f:
    bundle = json.load(f)

# Helper function to match streaming service for any item
def get_item_service(item):
    url = (item.get('platform_url') or '').lower()
    creator = (item.get('creator_publisher') or '').lower()
    title = (item.get('title') or '').lower()

    if 'youtube' in url or 'youtu.be' in url:
        return 'youtube'
    if 'disney' in url or 'disney' in creator:
        return 'disney'
    if 'netflix' in url or 'magic school bus' in title or 'octonauts' in title:
        return 'netflix'
    if 'amazon' in url or 'primevideo' in url:
        return 'prime'
    if 'paramountplus' in url or 'nick' in url or 'nick' in creator:
        return 'paramount'
    if 'pbskids' in url or 'pbs' in creator:
        return 'pbs'
    if 'apple' in url:
        return 'apple'
    if 'bbc' in url or 'cbeebies' in creator or 'bbc' in creator:
        return 'bbc'
    return 'other'

counts = {}
for cat_id, items in bundle['categoryItems'].items():
    for it in items:
        svc = get_item_service(it)
        counts[svc] = counts.get(svc, 0) + 1

print("MATCHED STREAMING SERVICES IN CURRENT BUNDLE:")
for svc, cnt in sorted(counts.items(), key=lambda x: x[1], reverse=True):
    print(f"  • {svc:<15}: {cnt:>4} items")
