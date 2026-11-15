import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('constants/bundled_kids_media.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def check_images(cat_name):
    print(f"\n--- {cat_name.upper()} ---")
    for item in data['categoryItems'].get(cat_name, []):
        meta = json.loads(item['metadata_json']) if item['metadata_json'] else {}
        img = meta.get('image', '')
        if isinstance(img, dict):
            img = img.get('original') or img.get('medium')
        if img:
            print(f"[{item['id']}] {item['title']} -> {img[:60]}...")

check_images('big_kids')
check_images('tweens')
check_images('pbs')
check_images('nick_jr')
