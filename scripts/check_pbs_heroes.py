import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('constants/bundled_kids_media.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for item in data['categoryItems']['pbs']:
    if any(k in item['title'] for k in ['Mister Rogers', 'Daniel Tiger', 'Arthur', 'Blue']):
        print(f"[{item['id']}] {item['title']}")
