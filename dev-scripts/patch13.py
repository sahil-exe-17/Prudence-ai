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

    # 1. Update the toggle3D Javascript to duplicate the canvas for holographic layers
    old_js = """window.toggle3D = function() {
          document.body.classList.toggle('mode-3d');
        };"""
        
    new_js = """window.toggle3D = function() {
          var is3D = document.body.classList.toggle('mode-3d');
          var preview = document.getElementById('preview');
          
          if (is3D) {
            // Find existing canvas or image
            var child = preview.querySelector('canvas') || preview.querySelector('img');
            if (child) {
              var layer1 = child.cloneNode(true);
              var layer2 = child.cloneNode(true);
              
              if (child.tagName === 'CANVAS') {
                layer1.getContext('2d').drawImage(child, 0, 0);
                layer2.getContext('2d').drawImage(child, 0, 0);
              }
              
              layer1.className = 'holo-layer holo-layer-1';
              layer2.className = 'holo-layer holo-layer-2';
              child.classList.add('holo-layer-base');
              
              preview.appendChild(layer1);
              preview.appendChild(layer2);
            }
          } else {
            // Remove holo layers when toggled off
            var layers = preview.querySelectorAll('.holo-layer');
            for(var i = 0; i < layers.length; i++) {
                layers[i].remove();
            }
            var base = preview.querySelector('.holo-layer-base');
            if (base) base.classList.remove('holo-layer-base');
          }
        };"""
        
    if 'holo-layer-base' not in text:
        text = text.replace(old_js, new_js)

    # 2. Add the Hologram CSS
    holo_css = """
      /* --- HOLOGRAM 3D CSS --- */
      .mode-3d .preview-wrapper {
        transform: rotateX(60deg) rotateZ(45deg) translateZ(-50px) scale(0.65);
        transform-style: preserve-3d;
      }
      .mode-3d #preview {
        transform-style: preserve-3d;
      }
      .mode-3d #annotation-layer {
        transform: translateZ(85px); /* Float annotations on top layer */
      }
      
      /* Base layer (bottom) */
      .holo-layer-base {
        filter: invert(1) brightness(0.3) opacity(0.5);
        box-shadow: 0 0 50px rgba(0, 243, 255, 0.2);
      }
      
      /* Middle Layer */
      .holo-layer-1 {
        position: absolute !important;
        top: 0; left: 0; width: 100%; height: 100%;
        transform: translateZ(40px);
        filter: invert(1) sepia(1) hue-rotate(180deg) saturate(3) opacity(0.6);
        pointer-events: none;
      }
      
      /* Top Glowing Layer */
      .holo-layer-2 {
        position: absolute !important;
        top: 0; left: 0; width: 100%; height: 100%;
        transform: translateZ(80px);
        filter: invert(1) sepia(1) hue-rotate(180deg) saturate(5) drop-shadow(0 0 8px #00f3ff) brightness(1.5);
        pointer-events: none;
        animation: pulseHolo 2s infinite alternate;
      }
      
      @keyframes pulseHolo {
        from { filter: invert(1) sepia(1) hue-rotate(180deg) saturate(5) drop-shadow(0 0 5px #00f3ff) brightness(1.2); }
        to { filter: invert(1) sepia(1) hue-rotate(180deg) saturate(5) drop-shadow(0 0 15px #00f3ff) brightness(1.8); }
      }
      /* ----------------------- */
"""
    if '/* --- HOLOGRAM 3D CSS --- */' not in text:
        text = text.replace('</style>', holo_css + '\n    </style>')

    # 3. Clean up the old 3D CSS that might conflict
    # Specifically, old .mode-3d .preview-wrapper
    old_3d_css = r'\.mode-3d \.preview-wrapper \{.*?transition: transform 0\.8s.*?;.*?\}'
    text = re.sub(old_3d_css, '', text, flags=re.DOTALL)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'Patched {path}')
