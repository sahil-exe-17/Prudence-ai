import re

with open('localhost/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

target_html = '\'<div class="violation-top"><span class="severity \' + severityClass + \'">\' + escapeHtml(severity) + \'</span><span style="color: rgba(255,255,255,.55);">Open</span></div>\''

if target_html in text:
    print('FOUND target_html exactly')
else:
    print('NOT FOUND exact string')
    # Let's search with regex to see how it looks
    m = re.search(r'<div class="violation-top">.*?</div\>', text)
    if m:
        print('Regex found:', repr(m.group(0)))
