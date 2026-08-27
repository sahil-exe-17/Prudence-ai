import os
import re

files = [
    'localhost/index.html',
    'vercel-deploy/index.html',
    'prudence-app.html',
    'prudence-test.html'
]

# We will rewrite the HTML of the preview-wrapper cleanly, moving holo-building to the bottom of the wrapper
clean_html = """          <div class="preview-wrapper">
            <div class="elevation-wall elevation-left"></div>
            <div class="elevation-wall elevation-right"></div>
            
            <div id="preview" class="preview"></div>
            <div id="annotation-layer"></div>

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
          </div>"""

for path in files:
    if not os.path.exists(path):
        continue
        
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Match the preview-wrapper block and replace it
    pattern = r'<div class="preview-wrapper">.*?</div>\s*</div>\s*</div>'
    # Actually let's target the exact preview-wrapper block
    # from `<div class="preview-wrapper">` to `</div>\s*</div>\s*<div id="loaded-badge"`
    pattern_badge = r'<div class="preview-wrapper">.*?<div id="loaded-badge"'
    text = re.sub(pattern_badge, clean_html + "\n          <div id=\"loaded-badge\"", text, flags=re.DOTALL)

    # Update CSS to larger size and high contrast grid lines
    old_css_regex = r'/\* --- CAD 3D WIREFRAME HOLOGRAM --- \*/.*?/\* ---------------------------------- \*/'
    
    new_css = """/* --- CAD 3D WIREFRAME HOLOGRAM --- */
      .preview-wrapper {
        position: absolute;
        inset: 0;
        perspective: 2000px;
        transform-style: preserve-3d;
        transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      .mode-3d .preview-wrapper {
        transform: rotateX(var(--rx, 60deg)) rotateZ(var(--rz, 45deg)) scale(0.6);
        transition: transform 0.05s linear;
      }
      
      /* Glowing Floor Grid */
      .preview-wrapper::before {
        content: "";
        position: absolute;
        inset: -100%;
        background: 
          linear-gradient(rgba(0, 243, 255, 0.15) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 243, 255, 0.15) 1px, transparent 1px);
        background-size: 50px 50px;
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
        filter: invert(1) sepia(1) hue-rotate(180deg) saturate(5) brightness(0.6) drop-shadow(0 0 15px rgba(0,243,255,0.3));
        pointer-events: none;
      }
      .elevation-left {
        top: 0; bottom: 0; left: 0; width: 100%;
        transform-origin: left;
        transform: rotateY(90deg);
        border-bottom: 3px solid rgba(0, 243, 255, 0.5);
      }
      .elevation-right {
        top: 0; left: 0; right: 0; height: 100%;
        transform-origin: top;
        transform: rotateX(-90deg);
        border-bottom: 3px solid rgba(0, 243, 255, 0.5);
      }
      .mode-3d .elevation-wall {
        opacity: 0.35;
      }
      
      /* 3D Extruded Building Model (Larger size: 300px x 240px) */
      .holo-building {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 300px;
        height: 240px;
        transform: translate3d(-50%, -50%, 0);
        transform-style: preserve-3d;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.8s ease;
        z-index: 100; /* Force rendering on top */
      }
      .mode-3d .holo-building {
        opacity: 0.95;
        animation: holoPulse 3s ease-in-out infinite alternate;
      }
      @keyframes holoPulse {
        0% { filter: drop-shadow(0 0 10px rgba(0, 243, 255, 0.4)) brightness(1); }
        100% { filter: drop-shadow(0 0 25px rgba(0, 243, 255, 0.8)) brightness(1.3); }
      }
      
      .holo-wall, .holo-roof, .holo-floor, .holo-gable {
        position: absolute;
        background: rgba(0, 243, 255, 0.08);
        border: 2px solid rgba(0, 243, 255, 1);
        box-shadow: 0 0 15px rgba(0, 243, 255, 0.3), inset 0 0 15px rgba(0, 243, 255, 0.2);
        transform-style: preserve-3d;
      }
      
      /* High-tech blueprint grid lines inside the walls */
      .holo-wall::after {
        content: "";
        position: absolute;
        inset: 10px;
        border: 1px dashed rgba(0, 243, 255, 0.5);
        background: repeating-linear-gradient(
          45deg,
          transparent,
          transparent 8px,
          rgba(0, 243, 255, 0.05) 8px,
          rgba(0, 243, 255, 0.05) 16px
        );
      }
      
      /* Floor 1 Walls (Height: 80px) */
      .wall-f { bottom: 0; left: 0; right: 0; height: 80px; transform-origin: bottom; transform: rotateX(-90deg); }
      .wall-b { top: 0; left: 0; right: 0; height: 80px; transform-origin: top; transform: rotateX(90deg); }
      .wall-l { top: 0; bottom: 0; left: 0; width: 80px; transform-origin: left; transform: rotateY(-90deg); }
      .wall-r { top: 0; bottom: 0; right: 0; width: 80px; transform-origin: right; transform: rotateY(90deg); }
      
      /* Floor 2 Divider (Z = 80px) */
      .floor-2 { inset: 0; transform: translateZ(80px); background: rgba(0, 243, 255, 0.15); }
      
      /* Floor 2 Walls (Height: 80px, Z = 80px) */
      .wall-f2 { bottom: 0; left: 0; right: 0; height: 80px; transform-origin: bottom; transform: translateZ(80px) rotateX(-90deg); }
      .wall-b2 { top: 0; left: 0; right: 0; height: 80px; transform-origin: top; transform: translateZ(80px) rotateX(90deg); }
      .wall-l2 { top: 0; bottom: 0; left: 0; width: 80px; transform-origin: left; transform: translateZ(80px) rotateY(-90deg); }
      .wall-r2 { top: 0; bottom: 0; right: 0; width: 80px; transform-origin: right; transform: translateZ(80px) rotateY(90deg); }
      
      /* Pitched Roof (Angle ~ 18.4deg, Z = 160px) */
      .roof-l {
        top: 0; bottom: 0; left: 0; width: 158px;
        transform-origin: left;
        transform: translateZ(160px) rotateY(18.4deg);
        background: rgba(0, 243, 255, 0.15);
        border: 2px solid rgba(0, 243, 255, 1);
      }
      .roof-r {
        top: 0; bottom: 0; right: 0; width: 158px;
        transform-origin: right;
        transform: translateZ(160px) rotateY(-18.4deg);
        background: rgba(0, 243, 255, 0.15);
        border: 2px solid rgba(0, 243, 255, 1);
      }
      
      /* Gable Triangle Closures (Z = 160px) */
      .holo-gable {
        height: 50px;
        background: rgba(0, 243, 255, 0.08);
        clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
      }
      .gable-f { bottom: 0; left: 0; right: 0; transform-origin: bottom; transform: translateZ(160px) rotateX(-90deg); }
      .gable-b { top: 0; left: 0; right: 0; transform-origin: top; transform: translateZ(160px) rotateX(90deg); }
      
      /* Soft cyan drop shadow on plan */
      .mode-3d #preview {
        filter: brightness(1.3) drop-shadow(0 0 25px rgba(0, 243, 255, 0.6));
      }
      
      /* Floated annotations */
      .mode-3d #annotation-layer {
        transform: translateZ(15px);
        transform-style: preserve-3d;
      }
      /* ---------------------------------- */"""

    text = re.sub(old_css_regex, new_css, text, flags=re.DOTALL)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"Patched hologram visibility and HTML order in {path}")
