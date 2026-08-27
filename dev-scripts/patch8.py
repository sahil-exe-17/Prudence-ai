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

    # 1. Fix #preview-content in CSS to #preview
    text = text.replace('.mode-3d #preview-content {', '.mode-3d #preview {')
    text = text.replace('#preview-content {', '#preview {')

    # 2. Fix applyAutoFix to turn on annotationLayer
    old_apply = """function applyAutoFix(btn, event) {
          if (event) { event.stopPropagation(); }
          if (!annotationLayer) return;
          var title = btn.closest('.violation').querySelector('h4').textContent;"""
          
    new_apply = """function applyAutoFix(btn, event) {
          if (event) { event.stopPropagation(); }
          if (!annotationLayer) return;
          var title = btn.closest('.violation').querySelector('h4').textContent;
          
          // Force annotations layer to be visible!
          state.annotations = true;
          viewer.classList.add("show-annotations");
          updateLayersButton();"""
          
    if 'state.annotations = true;' not in text:
        text = text.replace(old_apply, new_apply)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'Patched {path}')
