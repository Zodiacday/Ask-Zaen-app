import json

with open('constants/bundled_kids_media.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("BIG KIDS SHOWS:")
for item in data['categoryItems']['big_kids']:
    print(f"  [{item['id']}] {item['title']} - Age: {item['target_age_group']}")

print("\nTWEEN SHOWS:")
for item in data['categoryItems']['tweens']:
    print(f"  [{item['id']}] {item['title']} - Age: {item['target_age_group']}")
