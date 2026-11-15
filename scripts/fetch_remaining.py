import urllib.request
import re
import time
import os

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 KidsSanctuary2/1.0'}

time.sleep(2)
try:
    req = urllib.request.Request('https://upload.wikimedia.org/wikipedia/commons/4/4e/Paramount%2B_logo.svg', headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = resp.read()
        with open('assets/images/streaming/paramount.svg', 'wb') as f:
            f.write(data)
    print(f'paramount: SUCCESS ({len(data)} bytes)')
except Exception as e:
    print('paramount error:', e)

time.sleep(2)
try:
    req = urllib.request.Request('https://commons.wikimedia.org/wiki/File:PBS_Kids_logo_(2022).svg', headers=headers)
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        matches = re.findall(r'https://upload\.wikimedia\.org/wikipedia/commons/[^"]+\.svg', html)
        print('PBS matches:', set(matches))
        valid_matches = [m for m in matches if 'PBS' in m]
        target = valid_matches[0] if valid_matches else (matches[0] if matches else None)
        if target:
            time.sleep(2)
            req2 = urllib.request.Request(target, headers=headers)
            with urllib.request.urlopen(req2) as resp2:
                data2 = resp2.read()
                with open('assets/images/streaming/pbs.svg', 'wb') as f:
                    f.write(data2)
            print(f'pbs: SUCCESS ({len(data2)} bytes)')
except Exception as e:
    print('pbs error:', e)
