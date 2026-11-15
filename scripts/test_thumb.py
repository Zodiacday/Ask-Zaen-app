import urllib.request
import os

target_dir = r'C:\Users\natan\.gemini\antigravity-ide\scratch\netflix-expo\assets\images\streaming'
os.makedirs(target_dir, exist_ok=True)

# Using wikimedia with valid thumb widths e.g. 640px or 320px or direct
test_urls = {
    'youtube.png': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/YouTube_Logo_2017.svg/320px-YouTube_Logo_2017.svg.png',
    'netflix.png': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/320px-Netflix_2015_logo.svg.png',
}

headers = {'User-Agent': 'CalmKidsApp/1.0 (contact@calmkids.app)'}

for fname, url in test_urls.items():
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp, open(os.path.join(target_dir, fname), 'wb') as f:
            f.write(resp.read())
        print("Success:", fname)
    except Exception as e:
        print("Fail:", fname, e)
