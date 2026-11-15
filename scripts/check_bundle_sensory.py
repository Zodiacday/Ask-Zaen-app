import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


with open('constants/bundled_kids_media.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("Sample Bedtime item sensory profile:")
for item in data['categoryItems']['bedtime'][:2]:
    meta = json.loads(item['metadata_json']) if item.get('metadata_json') else {}
    print(f"- {item['title']} (Score: {item['stimulation_score']}, Label: {item['stimulation_label']})")
    print(f"  Sensory: {meta.get('sensory_profile')}")

print("\nSample PBS item sensory profile:")
for item in data['categoryItems']['pbs'][:2]:
    meta = json.loads(item['metadata_json']) if item.get('metadata_json') else {}
    print(f"- {item['title']} (Score: {item['stimulation_score']}, Label: {item['stimulation_label']})")
    print(f"  Sensory: {meta.get('sensory_profile')}")

print("\nSample Big Kids item sensory profile:")
for item in data['categoryItems']['big_kids'][:2]:
    meta = json.loads(item['metadata_json']) if item.get('metadata_json') else {}
    print(f"- {item['title']} (Score: {item['stimulation_score']}, Label: {item['stimulation_label']})")
    print(f"  Sensory: {meta.get('sensory_profile')}")

print("\nSample Tweens item sensory profile:")
for item in data['categoryItems']['tweens'][:2]:
    meta = json.loads(item['metadata_json']) if item.get('metadata_json') else {}
    print(f"- {item['title']} (Score: {item['stimulation_score']}, Label: {item['stimulation_label']})")
    print(f"  Sensory: {meta.get('sensory_profile')}")
