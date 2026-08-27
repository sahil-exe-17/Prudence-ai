import re
with open('localhost/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'<div id="preview"[^>]*>', text)
if m: print('exact preview:', m.group(0))
