with open('localhost/index.html', 'r', encoding='utf-8') as f:
    text = f.read()
idx = text.find('class="preview-container"')
if idx != -1:
    print(text[idx-50:idx+300])
else:
    print('NOT FOUND')
