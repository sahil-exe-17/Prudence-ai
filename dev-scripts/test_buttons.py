with open('localhost/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('class="preview-wrapper"')
# Wait, let's find the HTML one (after CSS, css ends at </style>)
css_end = text.find('</style>')
idx = text.find('preview-wrapper', css_end)
if idx != -1:
    print(text[idx-50:idx+600])
else:
    print("Not found")
