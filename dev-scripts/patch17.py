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
        
    # We want to match:
    # <div class="viewer">
    #   <div class="drop-zone" ...>
    #     ...
    #   </div>
    #   ... (any nested preview-wrappers) ...
    #   <div id="preview" ...></div>
    #   <div id="annotation-layer"></div>
    #   (and closing divs)
    
    # Let's find `<div class="viewer">` and the first `<!-- End Content -->` or where it ends.
    # The clean viewer block is:
    clean_html = """        <div class="viewer">
          <div class="drop-zone" id="drop-zone">
            <div class="drop-zone-content">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              <h3>Upload a construction drawing</h3>
              <p>Select a PDF or image plan. PRUDENCE will preview the file, mark likely compliance issues, and generate a local report for testing.</p>
              <button id="choose-button" class="solid-button" type="button" style="margin-top: 14px;">Choose File</button>
            </div>
          </div>
          <div class="preview-wrapper">
            <div class="elevation-wall elevation-left"></div>
            <div class="elevation-wall elevation-right"></div>
            
            <div class="holo-building">
              <!-- Floor 1 -->
              <div class="holo-wall wall-f"></div>
              <div class="holo-wall wall-b"></div>
              <div class="holo-wall wall-l"></div>
              <div class="holo-wall wall-r"></div>
              <div class="holo-floor floor-2"></div>
              
              <!-- Floor 2 -->
              <div class="holo-wall wall-f2"></div>
              <div class="holo-wall wall-b2"></div>
              <div class="holo-wall wall-l2"></div>
              <div class="holo-wall wall-r2"></div>
              
              <!-- Roof -->
              <div class="holo-roof roof-l"></div>
              <div class="holo-roof roof-r"></div>
              <div class="holo-gable gable-f"></div>
              <div class="holo-gable gable-b"></div>
            </div>
            <div id="preview" class="preview"></div>
            <div id="annotation-layer"></div>
          </div>
        </div>"""

    # Let's perform a broad search: find `<div class="viewer">` and replace everything down to `<!-- End Content -->`
    # Let's look for `<!-- End Content -->` which is right after the viewer closes.
    pattern = r'<div class="viewer">.*?<!-- End Content -->'
    text = re.sub(pattern, clean_html + "\n        <!-- End Content -->", text, flags=re.DOTALL)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"Successfully repaired HTML in {path}")
