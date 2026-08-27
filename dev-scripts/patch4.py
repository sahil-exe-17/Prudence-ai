import os

for path in ['localhost/index.html', 'vercel-deploy/index.html', 'prudence-app.html', 'prudence-test.html']:
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    toolstrip_add = """
            <span class="divider"></span>
            <button type="button" title="3D View" onclick="toggle3D()" style="font-weight:bold; color:#10b981;">3D</button>
            <button type="button" title="AI Chat" onclick="toggleChat()" style="font-weight:bold; color:#3b82f6;">Chat</button>
"""
    if "3D View" not in text:
        text = text.replace('<button type="button" title="Measure">M</button>', '<button type="button" title="Measure">M</button>' + toolstrip_add)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f'Injected 3D and Chat buttons into {path}')
    else:
        print(f'{path} already has buttons')
