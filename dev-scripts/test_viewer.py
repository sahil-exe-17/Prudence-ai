with open('localhost/index.html', 'r', encoding='utf-8') as f:
    text = f.read()
idx = text.find('class="viewer')
if idx != -1:
    print(text[idx-50:idx+200])
else:
    print('Not found')
