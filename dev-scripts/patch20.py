import os
import re

files = [
    'localhost/index.html',
    'vercel-deploy/index.html',
    'prudence-app.html',
    'prudence-test.html'
]

for path in files:
    if not os.path.exists(path):
        continue
        
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Match body { ... overflow: auto; ... } and replace it with hidden !important
    text = re.sub(r'body\s*\{([^}]*?)overflow:\s*auto;', r'body {\1overflow: hidden !important;', text)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"Fixed body scroll in {path}")
