import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('constants/bundled_kids_media.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("BIG KIDS:")
for item in data['categoryItems']['big_kids']:
    meta = json.loads(item['metadata_json']) if item['metadata_json'] else {}
    img = meta.get('image', '')
    if isinstance(img, dict):
        img = img.get('original') or img.get('medium')
    print(f"  {item['title']} -> {img}")

print("\nTWEENS:")
for item in data['categoryItems']['tweens']:
    meta = json.loads(item['metadata_json']) if item['metadata_json'] else {}
    img = meta.get('image', '')
    if isinstance(img, dict):
        img = img.get('original') or img.get('medium')
    print(f"  {item['title']} -> {img}")
