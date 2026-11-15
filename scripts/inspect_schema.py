import sqlite3
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conn = sqlite3.connect(r'C:\Users\natan\.gemini\antigravity\scratch\calm-kids-svelte\data\kids_media.db')
c = conn.cursor()

c.execute("PRAGMA table_info(kids_media)")
cols = c.fetchall()
print("kids_media columns:")
for col in cols:
    print(f"  {col[1]} ({col[2]})")
