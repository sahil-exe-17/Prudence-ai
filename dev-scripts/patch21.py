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

    # 1. Relocate the "3D View" and "AI Chat" buttons to the main <header> (top right)
    # Remove them from the left panel's controls
    old_controls = """            <button class="glass-button ai-prime-btn" onclick="toggle3D()" type="button">3D View</button>
            <button class="glass-button ai-prime-btn" onclick="toggleChat()" type="button">AI Chat</button>"""
    text = text.replace(old_controls, "")

    # Inject them at the right side of the main header
    old_header = """    <header>
      <div class="brand">
        <div class="brand-logo" aria-hidden="true"></div>
        <h1>PRUDENCE</h1>
        <span class="brand-subtitle">AI Compliance Agent</span>
      </div>
      <div class="search">
        <input placeholder="Search regulations, projects, or clauses..." aria-label="Search">
      </div>
    </header>"""

    new_header = """    <header>
      <div class="brand">
        <div class="brand-logo" aria-hidden="true"></div>
        <h1>PRUDENCE</h1>
        <span class="brand-subtitle">AI Compliance Agent</span>
      </div>
      <div class="search">
        <input placeholder="Search regulations, projects, or clauses..." aria-label="Search">
      </div>
      <div class="header-controls" style="display: flex; gap: 12px; margin-left: 20px; align-items: center;">
        <button class="glass-button ai-prime-btn" onclick="toggle3D()" type="button" style="padding: 8px 16px; font-weight: 600; color: #00f3ff; background: rgba(255,255,255,0.05); border: 1px solid rgba(0,243,255,0.3); border-radius: 8px; cursor: pointer; transition: all 0.2s;">3D View</button>
        <button class="glass-button ai-prime-btn" onclick="toggleChat()" type="button" style="padding: 8px 16px; font-weight: 600; color: #3b82f6; background: rgba(255,255,255,0.05); border: 1px solid rgba(59,130,246,0.3); border-radius: 8px; cursor: pointer; transition: all 0.2s;">AI Chat</button>
      </div>
    </header>"""
    
    text = text.replace(old_header, new_header)

    # 2. Fix the scroll: Apply native body scrolling with sticky left panel
    text = text.replace('body { overflow: hidden !important; }', 'body { overflow: auto !important; height: auto; min-height: 100vh; }')
    text = text.replace('body {\n        overflow: hidden !important;', 'body {\n        overflow: auto !important;\n        height: auto;\n        min-height: 100vh;')

    # Replace main CSS to grow naturally
    main_regex = r'main\s*\{[^}]*\}'
    text = re.sub(main_regex, """main {
        display: flex;
        height: auto;
        min-height: 100vh;
        overflow: visible;
        position: relative;
      }""", text, count=1)

    # Replace .left CSS to be sticky
    left_regex = r'\.left\s*\{[^}]*\}'
    text = re.sub(left_regex, """.left {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
        border-right: 1px solid rgba(255,255,255,.05);
        position: sticky;
        top: 80px;
        height: calc(100vh - 100px);
        align-self: flex-start;
      }""", text, count=1)

    # Replace .right CSS to expand naturally
    right_regex = r'\.right\s*\{[^}]*\}'
    text = re.sub(right_regex, """.right {
        width: 380px;
        background: #0b0f13;
        flex-shrink: 0;
        height: auto;
        overflow: visible;
      }""", text, count=1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"Patched scroll layout and header controls in {path}")
