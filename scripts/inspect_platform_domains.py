import sqlite3
from urllib.parse import urlparse
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conn = sqlite3.connect(r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db')
c = conn.cursor()

c.execute("SELECT platform_url FROM kids_media WHERE platform_url IS NOT NULL AND platform_url != ''")
urls = c.fetchall()

domains = {}
for (u,) in urls:
    try:
        netloc = urlparse(u).netloc.lower()
        if netloc.startswith('www.'):
            netloc = netloc[4:]
        domains[netloc] = domains.get(netloc, 0) + 1
    except:
        pass

print("TOP STREAMING PLATFORM DOMAINS IN DB:")
sorted_domains = sorted(domains.items(), key=lambda x: x[1], reverse=True)
for d, cnt in sorted_domains[:25]:
    print(f"  • {d:<30}: {cnt:>6,} items")

conn.close()
