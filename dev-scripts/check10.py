with open('localhost/index.html', 'r', encoding='utf-8') as f:
    text = f.read()
idx = text.find('class="controls"')
if idx != -1:
    print(text[idx:idx+400])
