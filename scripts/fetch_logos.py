import urllib.request
import time
import re
import os

os.makedirs('assets/images/streaming', exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 CalmKids/1.0'
}

known_urls = {
    'youtube': 'https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg',
    'disney': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',
    'netflix': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
    'prime': 'https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg',
    'paramount': 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Paramount%2B_logo.svg',
}

wiki_pages = {
    'pbs': 'https://commons.wikimedia.org/wiki/File:PBS_Kids_logo_(2022).svg',
    'apple': 'https://commons.wikimedia.org/wiki/File:Apple_TV_Plus_Logo.svg',
    'cbeebies': 'https://commons.wikimedia.org/wiki/File:CBeebies_2023.svg',
}

for name, url in known_urls.items():
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            out_path = f'assets/images/streaming/{name}.svg'
            with open(out_path, 'wb') as f:
                f.write(data)
            print(f'{name}: saved {len(data)} bytes to {out_path}')
    except Exception as e:
        print(f'{name} error: {e}')
    time.sleep(1.5)

for name, page in wiki_pages.items():
    try:
        req = urllib.request.Request(page, headers=headers)
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            m = re.search(r'href="(https://upload\.wikimedia\.org/wikipedia/commons/[^"]+\.svg)"', html)
            if m:
                upload_url = m.group(1)
                print(f'{name} found upload url: {upload_url}')
                time.sleep(1.5)
                req2 = urllib.request.Request(upload_url, headers=headers)
                with urllib.request.urlopen(req2) as resp2:
                    data2 = resp2.read()
                    out_path = f'assets/images/streaming/{name}.svg'
                    with open(out_path, 'wb') as f:
                        f.write(data2)
                    print(f'{name}: saved {len(data2)} bytes to {out_path}')
            else:
                print(f'{name}: could not find SVG link in {page}')
    except Exception as e:
        print(f'{name} page error: {e}')
    time.sleep(1.5)

print('Done fetching logos!')
