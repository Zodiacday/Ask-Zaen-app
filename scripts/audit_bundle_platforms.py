import json
from urllib.parse import urlparse
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('constants/bundled_kids_media.json', 'r', encoding='utf-8') as f:
    bundle = json.load(f)

platforms = {}
for cat_id, items in bundle['categoryItems'].items():
    for item in items:
        url = item.get('platform_url') or ''
        netloc = urlparse(url).netloc.lower()
        if 'youtube' in netloc or 'youtu.be' in netloc:
            p = 'YouTube'
        elif 'disneyplus' in netloc or 'disney' in netloc:
            p = 'Disney+'
        elif 'netflix' in netloc:
            p = 'Netflix'
        elif 'amazon' in netloc or 'primevideo' in netloc:
            p = 'Prime Video'
        elif 'paramountplus' in netloc or 'nick' in netloc:
            p = 'Paramount+ / Nick'
        elif 'apple' in netloc:
            p = 'Apple TV+'
        elif 'pbskids' in netloc or 'pbs' in netloc:
            p = 'PBS Kids'
        elif 'hoopla' in netloc:
            p = 'Hoopla'
        elif 'bbc' in netloc:
            p = 'BBC iPlayer'
        elif 'tvmaze' in netloc or not url:
            # Let's see if creator indicates platform
            c = item.get('creator_publisher') or ''
            if 'Disney' in c:
                p = 'Disney+'
            elif 'PBS' in c:
                p = 'PBS Kids'
            elif 'Nick' in c:
                p = 'Paramount+'
            elif 'CBeebies' in c or 'BBC' in c:
                p = 'BBC iPlayer'
            else:
                p = 'TV Broadcast'
        else:
            p = netloc or 'Other'
        platforms[p] = platforms.get(p, 0) + 1

print("STREAMING SERVICE DISTRIBUTION IN BUNDLE (729 items):")
for p, cnt in sorted(platforms.items(), key=lambda x: x[1], reverse=True):
    print(f"  • {p:<22}: {cnt:>4} items")
