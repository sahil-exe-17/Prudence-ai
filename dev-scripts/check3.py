import re
with open('localhost/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'<div[^>]*id="preview"[^>]*>', text)
if m: print('preview exact:', m.group(0))

m = re.search(r'<button[^>]*title="Show layers"[^>]*>', text)
if m: print('layers exact:', m.group(0))

# print context around Show layers
idx = text.find('title="Show layers"')
if idx != -1:
    print('Context around Show layers:', repr(text[idx-50:idx+50]))
