with open('localhost/index.html', 'r', encoding='utf-8') as f:
    text = f.read()
idx = text.find('#preview {')
if idx != -1:
    print(text[idx-50:idx+200])
else:
    print('NOT FOUND')
