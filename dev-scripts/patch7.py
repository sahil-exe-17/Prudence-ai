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

    # 1. Remove the crazy neon buttons from <div class="brand">
    neon_html = """
        <div class="prime-features" style="display: flex; gap: 15px; margin-left: 20px;">
          <button class="crazy-btn" onclick="toggle3D()" style="padding: 10px 20px; border-radius: 25px; background: linear-gradient(45deg, #ff007f, #ff8c00); color: white; font-weight: 900; border: none; cursor: pointer; font-size: 14px; text-transform: uppercase;">🔥 3D View</button>
          <button class="crazy-btn" onclick="toggleChat()" style="padding: 10px 20px; border-radius: 25px; background: linear-gradient(45deg, #00f2fe, #4facfe); color: white; font-weight: 900; border: none; cursor: pointer; font-size: 14px; text-transform: uppercase;">🤖 AI Chat</button>
        </div>"""
    
    if neon_html in text:
        text = text.replace(neon_html, '')
    else:
        # Regex just in case
        text = re.sub(r'<div class="prime-features".*?</div>', '', text, flags=re.DOTALL)

    # 2. Add them into the .controls div right after </select>
    glass_buttons = """
            <button class="glass-button ai-prime-btn" onclick="toggle3D()" type="button">3D View</button>
            <button class="glass-button ai-prime-btn" onclick="toggleChat()" type="button">AI Chat</button>"""
            
    if 'ai-prime-btn' not in text:
        text = text.replace('</select>', '</select>' + glass_buttons)

    # 3. Add liquid glass UI animation CSS
    liquid_glass_css = """
      /* --- LIQUID GLASS ANIMATIONS --- */
      @keyframes glassShine {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      .ai-prime-btn {
        position: relative;
        overflow: hidden;
        border-color: rgba(255,255,255,0.2) !important;
        box-shadow: 0 0 15px rgba(255,255,255,0.05);
      }
      .ai-prime-btn::after {
        content: "";
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        background-size: 200% 100%;
        animation: glassShine 3s infinite linear;
        pointer-events: none;
      }
      .ai-prime-btn:hover {
        background: rgba(255,255,255,0.1) !important;
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(255,255,255,0.1);
      }
      /* -------------------------- */
    """
    
    if '/* --- LIQUID GLASS ANIMATIONS --- */' not in text:
        text = text.replace('/* --- CRAZY ANIMATIONS --- */', liquid_glass_css + '\n      /* --- CRAZY ANIMATIONS --- */')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'Patched {path}')
