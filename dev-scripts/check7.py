import re
with open('localhost/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'v\.type.*', text)
if m: print(text[m.start()-50:m.start()+200])
else: print('not found')
