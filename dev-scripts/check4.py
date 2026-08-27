import re
with open('localhost/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'<div class="toolstrip".*?</div>', text, re.DOTALL)
if m: print(m.group(0))
