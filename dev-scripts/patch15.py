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

    # 1. Update HTML: inject elevation walls and the wireframe building inside preview-wrapper
    wrapper_html = """<div class="preview-wrapper">
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
            </div>"""
            
    if 'class="elevation-wall' not in text:
        text = text.replace('<div class="preview-wrapper">', wrapper_html)

    # 2. Update JS: Add Orbit controls and backdrop elevation url setters
    js_update = """window.toggle3D = function() {
          var is3D = document.body.classList.toggle('mode-3d');
          var preview = document.getElementById('preview');
          var leftWall = document.querySelector('.elevation-left');
          var rightWall = document.querySelector('.elevation-right');
          
          if (is3D && preview && leftWall && rightWall) {
            var child = preview.querySelector('canvas') || preview.querySelector('img');
            if (child) {
              var src = child.tagName === 'CANVAS' ? child.toDataURL() : child.src;
              leftWall.style.backgroundImage = 'url(' + src + ')';
              rightWall.style.backgroundImage = 'url(' + src + ')';
            }
          }
        };

        // --- ORBIT CONTROLS ---
        (function() {
          var isDragging = false;
          var startX, startY;
          var rx = 60;
          var rz = 45;
          
          document.addEventListener('mousedown', function(e) {
            if (!document.body.classList.contains('mode-3d')) return;
            // Only drag if clicking inside the left viewer
            if (!e.target.closest('.left')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
          });
          
          document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            var dx = e.clientX - startX;
            var dy = e.clientY - startY;
            
            rz += dx * 0.4;
            rx -= dy * 0.4;
            
            if (rx < 15) rx = 15;
            if (rx > 85) rx = 85;
            
            startX = e.clientX;
            startY = e.clientY;
            
            var wrapper = document.querySelector('.preview-wrapper');
            if (wrapper) {
              wrapper.style.setProperty('--rx', rx + 'deg');
              wrapper.style.setProperty('--rz', rz + 'deg');
            }
          });
          
          document.addEventListener('mouseup', function() {
            isDragging = false;
          });
        })();"""
        
    old_js = """window.toggle3D = function() {
          document.body.classList.toggle('mode-3d');
        };"""
        
    text = text.replace(old_js, js_update)

    # 3. Clean up the clean_3d_css block and insert the new fully-detailed CAD styles
    old_3d_css_regex = r'/\* --- CLEAN 3D HOLOGRAPHIC GRID --- \*/.*?/\* --------------------------------- \*/'
    
    cad_3d_css = """/* --- CAD 3D WIREFRAME HOLOGRAM --- */
      .preview-wrapper {
        position: absolute;
        inset: 0;
        perspective: 2000px;
        transform-style: preserve-3d;
        transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      .mode-3d .preview-wrapper {
        transform: rotateX(var(--rx, 60deg)) rotateZ(var(--rz, 45deg)) scale(0.55);
        transition: transform 0.05s linear; /* Fast response during dragging */
      }
      
      /* Glowing Floor Grid */
      .preview-wrapper::before {
        content: "";
        position: absolute;
        inset: -100%;
        background: 
          linear-gradient(rgba(0, 243, 255, 0.12) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 243, 255, 0.12) 1px, transparent 1px);
        background-size: 40px 40px;
        transform: translateZ(-5px);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.8s ease;
      }
      .mode-3d .preview-wrapper::before {
        opacity: 1;
      }
      
      /* Vertical Elevation Projections */
      .elevation-wall {
        position: absolute;
        background-size: contain;
        background-position: center bottom;
        background-repeat: no-repeat;
        opacity: 0;
        transition: opacity 0.8s ease;
        filter: invert(1) sepia(1) hue-rotate(180deg) saturate(4) brightness(0.5) drop-shadow(0 0 10px rgba(0,243,255,0.2));
        pointer-events: none;
      }
      .elevation-left {
        top: 0; bottom: 0; left: 0; width: 100%;
        transform-origin: left;
        transform: rotateY(90deg);
        border-bottom: 2px solid rgba(0, 243, 255, 0.3);
      }
      .elevation-right {
        top: 0; left: 0; right: 0; height: 100%;
        transform-origin: top;
        transform: rotateX(-90deg);
        border-bottom: 2px solid rgba(0, 243, 255, 0.3);
      }
      .mode-3d .elevation-wall {
        opacity: 0.25;
      }
      
      /* 3D Extruded Building Model */
      .holo-building {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 220px;
        height: 180px;
        transform: translate3d(-50%, -50%, 0);
        transform-style: preserve-3d;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.8s ease;
      }
      .mode-3d .holo-building {
        opacity: 0.85;
      }
      
      .holo-wall, .holo-roof, .holo-floor, .holo-gable {
        position: absolute;
        background: rgba(0, 243, 255, 0.05);
        border: 1px solid rgba(0, 243, 255, 0.7);
        box-shadow: 0 0 8px rgba(0, 243, 255, 0.2);
        transform-style: preserve-3d;
      }
      
      /* Columns/Windows overlay inside walls */
      .holo-wall::after {
        content: "";
        position: absolute;
        inset: 12px;
        border-left: 2px solid rgba(0, 243, 255, 0.7);
        border-right: 2px solid rgba(0, 243, 255, 0.7);
        border-top: 1px dashed rgba(0, 243, 255, 0.4);
        border-bottom: 1px dashed rgba(0, 243, 255, 0.4);
      }
      
      /* Floor 1 Walls (Height: 60px) */
      .wall-f { bottom: 0; left: 0; right: 0; height: 60px; transform-origin: bottom; transform: rotateX(-90deg); }
      .wall-b { top: 0; left: 0; right: 0; height: 60px; transform-origin: top; transform: rotateX(90deg); }
      .wall-l { top: 0; bottom: 0; left: 0; width: 60px; transform-origin: left; transform: rotateY(-90deg); }
      .wall-r { top: 0; bottom: 0; right: 0; width: 60px; transform-origin: right; transform: rotateY(90deg); }
      
      /* Floor 2 Divider (Z = 60px) */
      .floor-2 { inset: 0; transform: translateZ(60px); background: rgba(0, 243, 255, 0.1); }
      
      /* Floor 2 Walls (Height: 60px, Z = 60px) */
      .wall-f2 { bottom: 0; left: 0; right: 0; height: 60px; transform-origin: bottom; transform: translateZ(60px) rotateX(-90deg); }
      .wall-b2 { top: 0; left: 0; right: 0; height: 60px; transform-origin: top; transform: translateZ(60px) rotateX(90deg); }
      .wall-l2 { top: 0; bottom: 0; left: 0; width: 60px; transform-origin: left; transform: translateZ(60px) rotateY(-90deg); }
      .wall-r2 { top: 0; bottom: 0; right: 0; width: 60px; transform-origin: right; transform: translateZ(60px) rotateY(90deg); }
      
      /* Pitched Roof (Angle ~ 20deg, Z = 120px) */
      .roof-l {
        top: 0; bottom: 0; left: 0; width: 117px;
        transform-origin: left;
        transform: translateZ(120px) rotateY(20deg);
        background: rgba(0, 243, 255, 0.12);
        border: 2px solid rgba(0, 243, 255, 0.9);
      }
      .roof-r {
        top: 0; bottom: 0; right: 0; width: 117px;
        transform-origin: right;
        transform: translateZ(120px) rotateY(-20deg);
        background: rgba(0, 243, 255, 0.12);
        border: 2px solid rgba(0, 243, 255, 0.9);
      }
      
      /* Gable Triangle Closures (Z = 120px) */
      .holo-gable {
        height: 40px;
        background: rgba(0, 243, 255, 0.05);
        clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
      }
      .gable-f { bottom: 0; left: 0; right: 0; transform-origin: bottom; transform: translateZ(120px) rotateX(-90deg); }
      .gable-b { top: 0; left: 0; right: 0; transform-origin: top; transform: translateZ(120px) rotateX(90deg); }
      
      /* Soft cyan drop shadow on plan */
      .mode-3d #preview {
        filter: drop-shadow(0 0 15px rgba(0, 243, 255, 0.4));
      }
      
      /* Floated annotations */
      .mode-3d #annotation-layer {
        transform: translateZ(10px);
        transform-style: preserve-3d;
      }
      /* ---------------------------------- */"""
      
    text = re.sub(old_3d_css_regex, cad_3d_css, text, flags=re.DOTALL)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'Patched {path}')
