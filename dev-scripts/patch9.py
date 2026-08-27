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

    # 1. Revert Scrolling
    text = re.sub(r'(body\s*{[^}]*)overflow:\s*auto;', r'\1overflow: hidden;', text)
    text = re.sub(r'(main\s*{[^}]*)height:\s*auto;\s*min-height:\s*100vh;([^}]*)overflow:\s*visible;', r'\1height: 100vh;\2overflow: hidden;', text)

    # 2. Dream Aurora Colors CSS
    aurora_css = """
      /* --- DREAM AURORA --- */
      @keyframes auroraBG {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      header {
        background: linear-gradient(-45deg, rgba(162, 59, 255, 0.15), rgba(255, 59, 212, 0.15), rgba(59, 212, 255, 0.15), rgba(59, 255, 162, 0.15)) !important;
        background-size: 400% 400% !important;
        animation: auroraBG 10s ease infinite !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
      }
      .ai-prime-btn {
        background: linear-gradient(-45deg, rgba(162, 59, 255, 0.3), rgba(255, 59, 212, 0.3), rgba(59, 212, 255, 0.3), rgba(59, 255, 162, 0.3)) !important;
        background-size: 400% 400% !important;
        animation: auroraBG 5s ease infinite !important;
        border: 1px solid rgba(255, 255, 255, 0.5) !important;
        box-shadow: 0 0 20px rgba(162, 59, 255, 0.2) !important;
      }
      .ai-prime-btn:hover {
        background: linear-gradient(-45deg, rgba(162, 59, 255, 0.5), rgba(255, 59, 212, 0.5), rgba(59, 212, 255, 0.5), rgba(59, 255, 162, 0.5)) !important;
        box-shadow: 0 0 30px rgba(59, 212, 255, 0.4) !important;
        transform: translateY(-2px) scale(1.05);
      }
      @keyframes spin { 100% { transform: rotate(360deg); } }
      /* -------------------- */
    """
    
    if '/* --- DREAM AURORA --- */' not in text:
        text = text.replace('</style>', aurora_css + '\n    </style>')

    # 3. Loading Screen
    loading_html = """
    <!-- Crazy Loading Screen -->
    <div id="crazy-loader" style="position: fixed; inset: 0; z-index: 99999; background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: opacity 0.8s ease, transform 0.8s ease;">
      <div style="width: 80px; height: 80px; border: 4px solid rgba(162, 59, 255, 0.3); border-top-color: #3bd4ff; border-radius: 50%; animation: spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;"></div>
      <h2 style="margin-top: 30px; font-weight: 900; letter-spacing: 5px; background: linear-gradient(-45deg, #a23bff, #ff3bd4, #3bd4ff, #3bffa2); -webkit-background-clip: text; color: transparent; background-size: 400% 400%; animation: auroraBG 3s ease infinite;">PRUDENCE AI</h2>
    </div>
    <script>
      window.addEventListener('load', function() {
        setTimeout(function() {
          var loader = document.getElementById('crazy-loader');
          if(loader) {
            loader.style.opacity = '0';
            loader.style.transform = 'scale(1.1)';
            setTimeout(function() { loader.remove(); }, 800);
          }
        }, 1200);
      });
    </script>
    <!-- End Loading Screen -->
"""
    if '<!-- Crazy Loading Screen -->' not in text:
        text = text.replace('<body>', '<body>\n' + loading_html)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'Patched {path}')
