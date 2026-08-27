import os
import re

files = [
    'localhost/index.html',
    'vercel-deploy/index.html',
    'prudence-app.html',
    'prudence-test.html'
]

# We want to restore the HTML structure inside `<div class="viewer">` cleanly.
# The clean structure should be:
# <div class="viewer">
#   <div class="drop-zone" id="drop-zone">...</div>
#   <div class="preview-wrapper">
#     <div class="elevation-wall elevation-left"></div>
#     <div class="elevation-wall elevation-right"></div>
#     <div class="holo-building">...</div>
#     <div id="preview" class="preview"></div>
#     <div id="annotation-layer"></div>
#   </div>
# </div>

for path in files:
    if not os.path.exists(path):
        continue
        
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
        
    # Let's locate the entire `<div class="viewer">` to `<!-- End Content -->` or similar block
    # and replace the content inside with the clean version.
    
    # We can match everything from <div class="viewer"> down to the first occurrences of 
    # <!-- End Content --> or sibling divs.
    
    viewer_match = re.search(r'<div class="viewer">.*?<div id="preview" class="preview"></div>\s*<div id="annotation-layer"></div>', text, flags=re.DOTALL)
    
    # Actually, let's find the original viewer block and replace it.
    # In original PRUDENCE:
    # <div class="viewer">
    #   <div class="drop-zone" id="drop-zone">...</div>
    #   <div id="preview" class="preview"></div>
    #   <div id="annotation-layer"></div>
    # </div>
    
    # Let's do a robust regex replace of the viewer children
    # We match from `<div class="viewer">` up to `<div id="annotation-layer"></div>\s*</div>` (the closing tag of preview-wrapper or viewer)
    
    # Let's see what is currently in the file.
    # We know it has:
    # <div class="viewer">
    #   <div class="drop-zone" id="drop-zone">...</div>
    #   ... (potentially nested preview-wrappers and holo-buildings) ...
    #   <div id="preview" ...></div>
    #   <div id="annotation-layer"></div>
    # </div>
    
    # Let's extract the drop-zone block
    drop_zone_m = re.search(r'(<div class="drop-zone" id="drop-zone">.*?</div>\s*</div>)', text, flags=re.DOTALL)
    if not drop_zone_m:
        print(f"Skipping {path} - drop-zone not matched")
        continue
        
    drop_zone_html = drop_zone_m.group(1)
    
    new_viewer_content = f"""<div class="viewer">
          {drop_zone_html}
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
        
    # Replace from `<div class="viewer">` to the end of the annotations layer (including wrapping divs)
    # We can match `<div class="viewer">` all the way to `<div id="annotation-layer"></div>` and its closing tags
    pattern = r'<div class="viewer">.*?<div id="annotation-layer"></div>(?:\s*</div>)+'
    
    text = re.sub(pattern, new_viewer_content, text, flags=re.DOTALL)
    
    # Double check if any duplicated wrapper closes exist
    # Let's clean up any double closes.
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"Successfully repaired HTML in {path}")
