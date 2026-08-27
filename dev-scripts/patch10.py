import os

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

    # Wrap #preview and #annotation-layer in .preview-wrapper
    orig_dom = '<div id="preview" class="preview"></div>\n          <div id="annotation-layer"></div>'
    new_dom = '<div class="preview-wrapper">\n            <div id="preview" class="preview"></div>\n            <div id="annotation-layer"></div>\n          </div>'
    
    if 'class="preview-wrapper"' not in text:
        text = text.replace(orig_dom, new_dom)
        # If the exact string wasn't found due to spacing, fallback:
        if orig_dom not in text and '<div id="preview" class="preview"></div>' in text:
            import re
            text = re.sub(r'<div id="preview" class="preview"></div>\s*<div id="annotation-layer"></div>', new_dom, text)

    # Update CSS
    text = text.replace('.mode-3d #preview {', '.mode-3d .preview-wrapper {')
    text = text.replace('#preview {\n        transition: transform 0.8s', '.preview-wrapper {\n        position: absolute;\n        inset: 0;\n        perspective: 1500px;\n        transition: transform 0.8s')
    
    # Also scale it down slightly in 3D mode so it doesn't clip as much
    text = text.replace('transform: rotateX(60deg) rotateZ(45deg) translateZ(0);', 'transform: rotateX(60deg) rotateZ(45deg) translateZ(0) scale(0.7);')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'Patched {path}')
