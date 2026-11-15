import urllib.request
import os
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

target_dir = r'C:\Users\natan\.gemini\antigravity-ide\scratch\netflix-expo\assets\images\streaming'
os.makedirs(target_dir, exist_ok=True)

logos = {
    'youtube.png': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/YouTube_Logo_2017.svg/512px-YouTube_Logo_2017.svg.png',
    'disney.png': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Disney%2B_logo.svg/512px-Disney%2B_logo.svg.png',
    'netflix.png': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/512px-Netflix_2015_logo.svg.png',
    'prime.png': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Amazon_Prime_Video_logo.svg/512px-Amazon_Prime_Video_logo.svg.png',
    'paramount.png': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Paramount_Plus.svg/512px-Paramount_Plus.svg.png',
    'pbskids.png': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/PBS_Kids_logo_2022.svg/512px-PBS_Kids_logo_2022.svg.png',
    'appletv.png': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Apple_TV_Plus_Logo.svg/512px-Apple_TV_Plus_Logo.svg.png',
    'bbc.png': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/BBC_iPlayer_logo_%282021%29.svg/512px-BBC_iPlayer_logo_%282021%29.svg.png'
}

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for fname, url in logos.items():
    filepath = os.path.join(target_dir, fname)
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp, open(filepath, 'wb') as f:
            f.write(resp.read())
        print(f"Downloaded {fname} ({os.path.getsize(filepath)} bytes)")
    except Exception as e:
        print(f"Error downloading {fname}: {e}")

print("Download complete.")
