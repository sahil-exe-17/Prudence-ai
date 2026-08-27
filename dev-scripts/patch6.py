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

    # 1. Remove old prime features from bottom
    old_floating = """<!-- Prime Features -->
          <div class="prime-features" style="position: absolute; top: 20px; right: 20px; z-index: 99; display: flex; gap: 10px;">
            <button onclick="toggle3D()" style="padding: 10px 20px; border-radius: 20px; background: linear-gradient(135deg, #10b981, #059669); color: white; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(16,185,129,0.4); transition: transform 0.2s;">🔮 3D View</button>
            <button onclick="toggleChat()" style="padding: 10px 20px; border-radius: 20px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(59,130,246,0.4); transition: transform 0.2s;">💬 AI Chat</button>
          </div>"""
    if old_floating in text:
        text = text.replace(old_floating, '')
    elif '<div class="prime-features"' in text:
        # Regex remove if changed slightly
        text = re.sub(r'<!-- Prime Features -->\s*<div class="prime-features".*?</div>', '', text, flags=re.DOTALL)

    # 2. Insert new buttons into top left bar (<header> ... <div class="brand">...</div> )
    # Let's insert them right after <span class="brand-subtitle">AI Compliance Agent</span>
    new_prime = """
        <div class="prime-features" style="display: flex; gap: 15px; margin-left: 20px;">
          <button class="crazy-btn" onclick="toggle3D()" style="padding: 10px 20px; border-radius: 25px; background: linear-gradient(45deg, #ff007f, #ff8c00); color: white; font-weight: 900; border: none; cursor: pointer; font-size: 14px; text-transform: uppercase;">🔥 3D View</button>
          <button class="crazy-btn" onclick="toggleChat()" style="padding: 10px 20px; border-radius: 25px; background: linear-gradient(45deg, #00f2fe, #4facfe); color: white; font-weight: 900; border: none; cursor: pointer; font-size: 14px; text-transform: uppercase;">🤖 AI Chat</button>
        </div>"""
        
    if 'class="crazy-btn"' not in text:
        text = text.replace('<span class="brand-subtitle">AI Compliance Agent</span>', '<span class="brand-subtitle">AI Compliance Agent</span>' + new_prime)

    # 3. Add crazy animations to CSS
    crazy_css = """
      /* --- CRAZY ANIMATIONS --- */
      @keyframes crazyGlow {
        0% { box-shadow: 0 0 5px rgba(255,0,127,0.5), 0 0 10px rgba(255,0,127,0.3); transform: scale(1); }
        50% { box-shadow: 0 0 20px rgba(255,140,0,0.8), 0 0 30px rgba(255,140,0,0.5); transform: scale(1.05); }
        100% { box-shadow: 0 0 5px rgba(255,0,127,0.5), 0 0 10px rgba(255,0,127,0.3); transform: scale(1); }
      }
      @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-100px) rotate(-5deg); }
        to { opacity: 1; transform: translateX(0) rotate(0); }
      }
      @keyframes popIn {
        0% { opacity: 0; transform: scale(0.5) translateY(50px); }
        70% { transform: scale(1.1) translateY(-10px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      .crazy-btn {
        animation: crazyGlow 2s infinite ease-in-out;
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }
      .crazy-btn:hover {
        transform: scale(1.15) rotate(3deg) !important;
        filter: brightness(1.2);
      }
      .violation {
        animation: slideInLeft 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
      }
      .violation:nth-child(1) { animation-delay: 0.1s; }
      .violation:nth-child(2) { animation-delay: 0.2s; }
      .violation:nth-child(3) { animation-delay: 0.3s; }
      .violation:nth-child(4) { animation-delay: 0.4s; }
      .violation:nth-child(5) { animation-delay: 0.5s; }
      
      .chat-sidebar {
        animation: slideInRight 0.4s ease-out;
      }
      @keyframes slideInRight {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
      
      /* Make main elements pop in */
      .left .section-head, .rule-pack-bar, .viewer {
        animation: popIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) both;
      }
      .left .section-head { animation-delay: 0.2s; }
      .rule-pack-bar { animation-delay: 0.4s; }
      .viewer { animation-delay: 0.6s; }
      /* -------------------------- */
    </style>"""
    
    if '/* --- CRAZY ANIMATIONS --- */' not in text:
        text = text.replace('</style>', crazy_css)
        
    # 4. Make app scrollable
    text = text.replace('body {\n        margin: 0;\n        min-width: 320px;\n        min-height: 100vh;\n        overflow: hidden;\n        background: #000;\n      }', 'body {\n        margin: 0;\n        min-width: 320px;\n        min-height: 100vh;\n        overflow: auto;\n        background: #000;\n      }')
    text = text.replace('main {\n        position: relative;\n        z-index: 2;\n        display: flex;\n        height: 100vh;\n        padding-top: 80px;\n        overflow: hidden;\n      }', 'main {\n        position: relative;\n        z-index: 2;\n        display: flex;\n        height: auto;\n        min-height: 100vh;\n        padding-top: 80px;\n        overflow: visible;\n      }')
    text = text.replace('.viewer {\n        position: relative;\n        flex: 1;\n        min-height: 0;', '.viewer {\n        position: relative;\n        flex: 1;\n        min-height: 600px;')

    # Fix CSS replacement if they don't match exactly by using regex
    # body overflow
    text = re.sub(r'(body\s*{[^}]*)overflow:\s*hidden;', r'\1overflow: auto;', text, count=1)
    # main height and overflow
    text = re.sub(r'(main\s*{[^}]*)height:\s*100vh;([^}]*)overflow:\s*hidden;', r'\1height: auto;\n        min-height: 100vh;\2overflow: visible;', text, count=1)
    
    # Let's verify we didn't double replace
    # Just to be safe, the regex is more robust.
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'Patched {path}')
