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

    # 1. Remove Dream Aurora CSS but keep @keyframes spin
    # We can just replace the whole block with @keyframes spin
    aurora_regex = r'/\* --- DREAM AURORA --- \*/.*?/\* -------------------- \*/'
    spin_css = """/* --- LOADER CSS --- */
      @keyframes spin { 100% { transform: rotate(360deg); } }
      /* ------------------ */"""
    
    text = re.sub(aurora_regex, spin_css, text, flags=re.DOTALL)

    # 2. Replace the Neon Loading Screen with a professional one
    loader_regex = r'<!-- Crazy Loading Screen -->.*?<!-- End Loading Screen -->'
    prof_loader = """<!-- Professional Loading Screen -->
    <div id="crazy-loader" style="position: fixed; inset: 0; z-index: 99999; background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: opacity 0.8s ease, transform 0.8s ease;">
      <div style="width: 60px; height: 60px; border: 3px solid rgba(255, 255, 255, 0.1); border-top-color: #fff; border-radius: 50%; animation: spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;"></div>
      <h2 style="margin-top: 30px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: 4px; color: rgba(255,255,255,0.8);">PRUDENCE AI</h2>
    </div>
    <script>
      window.addEventListener('load', function() {
        setTimeout(function() {
          var loader = document.getElementById('crazy-loader');
          if(loader) {
            loader.style.opacity = '0';
            loader.style.transform = 'scale(1.05)';
            setTimeout(function() { loader.remove(); }, 800);
          }
        }, 800);
      });
    </script>
    <!-- End Loading Screen -->"""
    
    text = re.sub(loader_regex, prof_loader, text, flags=re.DOTALL)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'Patched {path}')
