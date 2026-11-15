import os
import glob
import re

for filepath in sorted(glob.glob('assets/images/streaming/*.svg')):
    name = os.path.basename(filepath)
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    fills = re.findall(r'fill="([^"]+)"', content)
    styles = re.findall(r'style="([^"]+)"', content)
    viewBox = re.findall(r'viewBox="([^"]+)"', content)
    
    print(f'=== {name} ===')
    print(f'  viewBox: {viewBox[0] if viewBox else "None"}')
    print(f'  fills: {set(fills)}')
    print(f'  styles: {list(set(styles))[:3]}')
