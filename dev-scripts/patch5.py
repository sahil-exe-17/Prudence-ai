import os
import re

files = [
    'localhost/index.html',
    'vercel-deploy/index.html',
    'prudence-app.html',
    'prudence-test.html'
]

for path in files:
    if not os.path.exists(path):
        continue
    
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. Remove old toolstrip buttons inserted in patch4.py
    old_buttons = """
            <span class="divider"></span>
            <button type="button" title="3D View" onclick="toggle3D()" style="font-weight:bold; color:#10b981;">3D</button>
            <button type="button" title="AI Chat" onclick="toggleChat()" style="font-weight:bold; color:#3b82f6;">Chat</button>
"""
    if old_buttons in text:
        text = text.replace(old_buttons, '')

    # 2. Add prime features floating container
    floating_buttons = """
          <!-- Prime Features -->
          <div class="prime-features" style="position: absolute; top: 20px; right: 20px; z-index: 99; display: flex; gap: 10px;">
            <button onclick="toggle3D()" style="padding: 10px 20px; border-radius: 20px; background: linear-gradient(135deg, #10b981, #059669); color: white; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(16,185,129,0.4); transition: transform 0.2s;">🔮 3D View</button>
            <button onclick="toggleChat()" style="padding: 10px 20px; border-radius: 20px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(59,130,246,0.4); transition: transform 0.2s;">💬 AI Chat</button>
          </div>
"""
    if '<!-- Prime Features -->' not in text:
        text = text.replace('<!-- AI Chat Sidebar -->', floating_buttons + '\n          <!-- AI Chat Sidebar -->')

    # 3. Add ✨ Auto-Fix button to renderViolations
    target_html = '\'<div class="violation-top"><span class="severity \' + severityClass + \'">\' + escapeHtml(severity) + \'</span><span style="color: rgba(255,255,255,.55);">Open</span></div>\''
    
    new_html = '\'<div class="violation-top" style="align-items: center; justify-content: space-between;"><div style="display:flex; align-items:center; gap:10px;"><span class="severity \' + severityClass + \'">\' + escapeHtml(severity) + \'</span><span style="color: rgba(255,255,255,.55);">Open</span></div><button class="auto-fix-btn" onclick="applyAutoFix(this, event)">✨ Auto-Fix</button></div>\''
    
    text = text.replace(target_html, new_html)

    # 4. Update applyAutoFix function to handle the HTML button element
    old_apply = """function applyAutoFix(violation) {
          if (!annotationLayer) return;
          var ghost = document.createElement('div');
          ghost.className = 'annotation auto-fix-ghost';
          ghost.style.left = '20%';
          ghost.style.top = '70%';
          ghost.style.width = '15%';
          ghost.style.height = '10%';
          
          var label = document.createElement('div');
          label.className = 'label';
          label.textContent = 'Proposed Fix: ' + violation.type;
          ghost.appendChild(label);
          
          annotationLayer.appendChild(ghost);
          syncAnnotationLayer();
        }"""
        
    new_apply = """function applyAutoFix(btn, event) {
          if (event) { event.stopPropagation(); }
          if (!annotationLayer) return;
          var title = btn.closest('.violation').querySelector('h4').textContent;
          
          var ghost = document.createElement('div');
          ghost.className = 'annotation auto-fix-ghost';
          ghost.style.left = '20%';
          ghost.style.top = '70%';
          ghost.style.width = '15%';
          ghost.style.height = '10%';
          
          var label = document.createElement('div');
          label.className = 'label';
          label.textContent = 'Proposed Fix: ' + title;
          ghost.appendChild(label);
          
          annotationLayer.appendChild(ghost);
          syncAnnotationLayer();
        }"""
        
    text = text.replace(old_apply, new_apply)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'Patched {path}')
