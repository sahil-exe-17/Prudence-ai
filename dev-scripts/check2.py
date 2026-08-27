with open('localhost/index.html', 'r', encoding='utf-8') as f:
    text = f.read()
    print('viewer class count:', text.count('class="viewer"'))
    print('toolbar class count:', text.count('class="toolbar"'))
    print('toolstrip class count:', text.count('class="toolstrip"'))
    print('preview id count:', text.count('id="preview"'))
