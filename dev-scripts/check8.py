import re
with open('localhost/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'function renderViolations.*', text)
if m: print(text[m.start():m.start()+500])
else: print('not found')
