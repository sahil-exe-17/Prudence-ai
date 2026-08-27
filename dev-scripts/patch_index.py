import os
import re

file_path = 'index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add CSS
css_add = """
      /* --- AI FEATURES CSS --- */
      .chat-sidebar {
        position: absolute;
        top: 60px;
        bottom: 0;
        right: 0;
        width: 350px;
        background: rgba(15, 20, 25, 0.95);
        border-left: 1px solid rgba(255,255,255,0.1);
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        z-index: 100;
        backdrop-filter: blur(10px);
      }
      .chat-sidebar.open {
        transform: translateX(0);
      }
      .chat-header {
        padding: 15px;
        font-weight: 600;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .chat-header .close-btn {
        cursor: pointer;
        opacity: 0.7;
      }
      .chat-header .close-btn:hover { opacity: 1; }
      .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .chat-msg {
        padding: 10px 14px;
        border-radius: 12px;
        max-width: 85%;
        line-height: 1.4;
        animation: fadeIn 0.3s ease;
      }
      .chat-msg.user {
        background: #2563eb;
        align-self: flex-end;
      }
      .chat-msg.ai {
        background: rgba(255,255,255,0.1);
        align-self: flex-start;
      }
      .chat-input-area {
        padding: 15px;
        border-top: 1px solid rgba(255,255,255,0.1);
        display: flex;
        gap: 10px;
      }
      .chat-input-area input {
        flex: 1;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        color: white;
        padding: 10px 14px;
        border-radius: 20px;
        outline: none;
      }
      .chat-input-area input:focus {
        border-color: #2563eb;
      }
      
      .auto-fix-btn {
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        border: none;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        margin-left: 10px;
        box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
        transition: all 0.2s;
      }
      .auto-fix-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 0 15px rgba(16, 185, 129, 0.6);
      }
      
      .auto-fix-ghost {
        position: absolute;
        border: 2px dashed #10b981;
        background: rgba(16, 185, 129, 0.2);
        box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
        animation: pulseGhost 2s infinite;
        pointer-events: none;
      }
      
      @keyframes pulseGhost {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
      }
      
      .preview-container {
        position: absolute;
        inset: 0;
        perspective: 1500px; /* For 3D mode */
        overflow: hidden;
      }
      
      .mode-3d #preview-content {
        transform: rotateX(60deg) rotateZ(45deg) translateZ(0);
        box-shadow: 
          -10px 10px 20px rgba(0,0,0,0.5),
          -20px 20px 0px rgba(255,255,255,0.05),
          -40px 40px 0px rgba(255,255,255,0.02);
        transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.8s ease;
      }
      #preview-content {
        transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.8s ease;
      }
      /* ------------------------- */
"""
text = text.replace('</style>', css_add + '\n    </style>')

# 2. Wrap .preview in .preview-container
text = text.replace('<div id="preview" class="preview">', '<div class="preview-container">\n            <div id="preview" class="preview">')
text = text.replace('<!-- End Content -->', '</div>\n          <!-- End Content -->')


# 3. Add Toolstrip buttons & Chat Sidebar HTML
html_add = """
          <!-- AI Chat Sidebar -->
          <div id="chat-sidebar" class="chat-sidebar">
            <div class="chat-header">
              <span>💬 AI Assistant</span>
              <span class="close-btn" onclick="toggleChat()">✕</span>
            </div>
            <div id="chat-messages" class="chat-messages">
              <div class="chat-msg ai">Hello! Ask me anything about this blueprint.</div>
            </div>
            <div class="chat-input-area">
              <input type="text" id="chat-input" placeholder="Ask a question..." onkeypress="if(event.key==='Enter') sendChatMessage()">
            </div>
          </div>
"""
text = text.replace('<!-- End Content -->', '<!-- End Content -->\n' + html_add)

toolstrip_add = """
            <div class="divider"></div>
            <button title="3D View" onclick="toggle3D()" style="font-weight:bold; color:#10b981;">3D</button>
            <button title="AI Chat" onclick="toggleChat()" style="font-weight:bold; color:#3b82f6;">Chat</button>
"""
text = text.replace('<div class="divider"></div>\n            <button title="Show layers"', toolstrip_add + '\n            <div class="divider"></div>\n            <button title="Show layers"')

# 4. Modify JS renderViolations to add Auto-Fix
js_violation_old = """var type = document.createElement("div");
              type.className = "violation-type";
              type.textContent = v.type;"""

js_violation_new = """var type = document.createElement("div");
              type.className = "violation-type";
              type.textContent = v.type;
              
              var fixBtn = document.createElement("button");
              fixBtn.className = "auto-fix-btn";
              fixBtn.innerHTML = "✨ Auto-Fix";
              fixBtn.onclick = function() { applyAutoFix(v); };
              type.appendChild(fixBtn);"""
text = text.replace(js_violation_old, js_violation_new)

# 5. Add new JS logic
js_logic_add = """
        // --- AI FEATURES LOGIC ---
        var chatHistory = [];
        function toggleChat() {
          document.getElementById('chat-sidebar').classList.toggle('open');
        }
        function toggle3D() {
          document.body.classList.toggle('mode-3d');
        }
        
        function applyAutoFix(violation) {
          if (!annotationLayer) return;
          // Simulated visually stunning auto-fix overlay
          var ghost = document.createElement('div');
          ghost.className = 'annotation auto-fix-ghost';
          // Mock geometry for demonstration
          ghost.style.left = '20%';
          ghost.style.top = '70%';
          ghost.style.width = '15%';
          ghost.style.height = '10%';
          
          var label = document.createElement('div');
          label.className = 'label';
          label.textContent = 'Proposed Fix: ' + violation.type;
          ghost.appendChild(label);
          
          annotationLayer.appendChild(ghost);
          syncAnnotationLayer();
        }
        
        function sendChatMessage() {
          var input = document.getElementById('chat-input');
          var text = input.value.trim();
          if (!text) return;
          
          input.value = '';
          var msgs = document.getElementById('chat-messages');
          msgs.innerHTML += '<div class="chat-msg user">' + escapeHtml(text) + '</div>';
          msgs.scrollTop = msgs.scrollHeight;
          
          chatHistory.push({role: 'user', content: text});
          
          fetch('/api/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              history: chatHistory.slice(0, -1),
              message: text,
              analysis: state.analysis || {}
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.error) {
              msgs.innerHTML += '<div class="chat-msg ai" style="color:#ef4444;">Error: ' + escapeHtml(data.error) + '</div>';
            } else {
              chatHistory.push({role: 'model', content: data.response});
              msgs.innerHTML += '<div class="chat-msg ai">' + escapeHtml(data.response) + '</div>';
            }
            msgs.scrollTop = msgs.scrollHeight;
          })
          .catch(err => {
            msgs.innerHTML += '<div class="chat-msg ai" style="color:#ef4444;">Failed to send message.</div>';
          });
        }
        // -------------------------
"""
text = text.replace('function runCurrentAnalysis() {', js_logic_add + '\n        function runCurrentAnalysis() {')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("index.html patched!")
