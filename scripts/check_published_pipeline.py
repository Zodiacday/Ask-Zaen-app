import json
from pathlib import Path

ROOT = Path(r"C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte")
published_path = ROOT / "content" / "published-content.json"
reviews_dir = ROOT / "content" / "reviews"

if published_path.exists():
    pub = json.loads(published_path.read_text(encoding="utf-8"))
    items = pub.get("items", []) if isinstance(pub, dict) else pub
    print(f"Published items count: {len(items)}")
    low_count = sum(1 for it in items if it.get("classification") == "low")
    high_count = sum(1 for it in items if it.get("classification") == "high")
    print(f"  Low (Discovery): {low_count}")
    print(f"  High (Bad): {high_count}")

review_files = list(reviews_dir.glob("*.json"))
print(f"\nReview files in content/reviews: {len(review_files)}")
total_reviews = 0
for rf in review_files:
    data = json.loads(rf.read_text(encoding="utf-8"))
    revs = data.get("reviews", []) if isinstance(data, dict) else data
    total_reviews += len(revs)
print(f"Total structured reviews written: {total_reviews}")
