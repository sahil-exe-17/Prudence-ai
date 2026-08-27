with open('localhost/index.html', 'r', encoding='utf-8') as f:
    text = f.read()
print('annotationLayer:', 'var annotationLayer' in text)
print('annotation-layer ID:', 'id="annotation-layer"' in text)
