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

    # 1. Fix Scrolling Logic
    text = re.sub(r'(body\s*{[^}]*)overflow:\s*hidden;', r'\1overflow: auto;', text, count=1)
    text = re.sub(r'(main\s*{[^}]*)height:\s*100vh;([^}]*)overflow:\s*hidden;', r'\1height: auto;\n        min-height: 100vh;\2overflow: visible;', text, count=1)
    
    left_sticky = """
      .left {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
        border-right: 1px solid rgba(255,255,255,.05);
        position: sticky;
        top: 80px;
        height: calc(100vh - 80px);
      }"""
    # Replace .left CSS
    text = re.sub(r'\.left\s*\{[^}]*\}', left_sticky, text, count=1)
    
    # Remove right panel height restriction so it scrolls
    right_css = """
      .right {
        width: 380px;
        background: #0b0f13;
        flex-shrink: 0;
        /* Let it grow naturally with content */
      }"""
    text = re.sub(r'\.right\s*\{[^}]*\}', right_css, text, count=1)


    # 2. Revert JS for toggle3D to simply toggle the class
    js_regex = r'window\.toggle3D = function\(\) \{.*?\n        \};'
    simple_toggle = """window.toggle3D = function() {
          document.body.classList.toggle('mode-3d');
        };"""
    text = re.sub(js_regex, simple_toggle, text, flags=re.DOTALL)


    # 3. Clean up old Hologram CSS and build the clean CSS 3D Hologram Grid
    holo_regex = r'/\* --- HOLOGRAM 3D CSS --- \*/.*?/\* ----------------------- \*/'
    
    clean_3d_css = """/* --- CLEAN 3D HOLOGRAPHIC GRID --- */
      .mode-3d .preview-wrapper {
        transform: rotateX(60deg) rotateZ(45deg) translateZ(0) scale(0.65);
        transform-style: preserve-3d;
      }
      
      /* The Glowing Grid Base */
      .preview-wrapper::before {
        content: "";
        position: absolute;
        inset: -100%;
        background: 
          linear-gradient(rgba(0, 243, 255, 0.15) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 243, 255, 0.15) 1px, transparent 1px);
        background-size: 50px 50px;
        transform: translateZ(-2px); /* Just slightly under the plan */
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.8s ease;
      }
      .mode-3d .preview-wrapper::before {
        opacity: 1;
        animation: gridPan 20s linear infinite;
      }
      @keyframes gridPan {
        from { background-position: 0 0; }
        to { background-position: 50px 50px; }
      }
      
      /* The Plan Image */
      .mode-3d #preview {
        filter: drop-shadow(0 0 15px rgba(0, 243, 255, 0.5)) drop-shadow(0 0 30px rgba(0, 243, 255, 0.2));
        transform-style: preserve-3d;
      }
      
      /* The Annotations */
      .mode-3d #annotation-layer {
        /* Keep Z translation small (10px) to prevent massive parallax drift from targets */
        transform: translateZ(10px); 
        transform-style: preserve-3d;
      }
      .mode-3d .annotation {
        /* Make annotations cast shadows in 3D */
        box-shadow: 0 10px 20px rgba(0,0,0,0.8), 0 0 15px rgba(255,0,0,0.5);
      }
      /* --------------------------------- */"""
      
    if '/* --- HOLOGRAM 3D CSS --- */' in text:
        text = re.sub(holo_regex, clean_3d_css, text, flags=re.DOTALL)
    elif '/* --- CLEAN 3D HOLOGRAPHIC GRID --- */' not in text:
        text = text.replace('</style>', clean_3d_css + '\n    </style>')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'Patched {path}')
