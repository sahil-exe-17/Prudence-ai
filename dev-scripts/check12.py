with open('localhost/index.html', 'r', encoding='utf-8') as f:
    text = f.read()
print('preview-content ID:', 'id="preview-content"' in text)
