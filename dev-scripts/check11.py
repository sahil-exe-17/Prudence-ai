with open('localhost/index.html', 'r', encoding='utf-8') as f:
    text = f.read()
print('preview-container:', 'preview-container' in text)
print('mode-3d CSS:', '.mode-3d' in text)
print('chat-sidebar:', 'id="chat-sidebar"' in text)
print('toggle3D:', 'function toggle3D' in text)
print('applyAutoFix:', 'function applyAutoFix' in text)
print('viewer/preview id:', 'id="preview"' in text or 'id="viewer"' in text)
