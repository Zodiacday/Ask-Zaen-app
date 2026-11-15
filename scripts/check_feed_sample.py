import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('constants/bundled_kids_media.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("Calm Feed First 5:")
for item in data['calmFeed'][:5]:
    print(f"  [{item['id']}] {item['title']} - Creator: {item['creator_publisher']} - Age: {item['target_age_group']}")

print("\nPBS Shows in category:")
for item in data['categoryItems'].get('pbs', [])[:5]:
    print(f"  [{item['id']}] {item['title']} - Age: {item['target_age_group']}")
