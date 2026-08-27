import os
import re

files = [
    'localhost/index.html',
    'vercel-deploy/index.html',
    'prudence-app.html',
    'prudence-test.html'
]

# 1. HTML structure of the new Chat Tab
chat_html_content = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PRUDENCE AI - Architectural Chat Assistant</title>
  <style>
    :root {
      --bg: #07090e;
      --panel: rgba(18, 22, 33, 0.7);
      --border: rgba(255, 255, 255, 0.08);
      --cyan: #00f3ff;
      --blue: #2563eb;
      --text: #f3f4f6;
    }
    body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      height: 100vh;
      overflow: hidden;
    }
    /* Split layout */
    .sidebar {
      width: 320px;
      background: var(--panel);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(20px);
    }
    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid var(--border);
      font-weight: 700;
      letter-spacing: 2px;
      color: var(--cyan);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .violations-list {
      flex: 1;
      overflow-y: auto;
      padding: 15px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .violation-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .violation-card:hover {
      border-color: var(--cyan);
      background: rgba(0, 243, 255, 0.03);
    }
    .violation-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .violation-meta {
      opacity: 0.6;
      font-size: 11px;
    }
    
    /* Main Chat Panel */
    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: radial-gradient(circle at 50% 50%, #0d1220, #07090e);
    }
    .chat-header {
      padding: 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 30px;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .message {
      max-width: 70%;
      padding: 14px 18px;
      border-radius: 14px;
      line-height: 1.5;
      font-size: 14px;
      animation: slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .message.user {
      align-self: flex-end;
      background: var(--blue);
      color: white;
      box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
    }
    .message.ai {
      align-self: flex-start;
      background: var(--panel);
      border: 1px solid var(--border);
      backdrop-filter: blur(10px);
    }
    .chat-input-container {
      padding: 20px 30px;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 15px;
    }
    .chat-input-wrapper {
      flex: 1;
      position: relative;
    }
    .chat-input-wrapper input {
      width: 100%;
      box-sizing: border-box;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--border);
      color: white;
      padding: 16px 20px;
      border-radius: 30px;
      font-size: 14px;
      outline: none;
      transition: all 0.3s;
    }
    .chat-input-wrapper input:focus {
      border-color: var(--cyan);
      box-shadow: 0 0 15px rgba(0, 243, 255, 0.2);
      background: rgba(255,255,255,0.05);
    }
    .send-btn {
      background: var(--cyan);
      color: #000;
      border: none;
      padding: 0 25px;
      border-radius: 30px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 0 15px rgba(0, 243, 255, 0.3);
    }
    .send-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 0 20px rgba(0, 243, 255, 0.5);
    }
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="sidebar-header">
      <span>📐 BLUEPRINT COMPLIANCE</span>
    </div>
    <div class="violations-list" id="violations-list">
      <!-- Dynamic Violations -->
    </div>
  </div>
  <div class="chat-container">
    <div class="chat-header">
      <div style="font-weight: 600; font-size: 16px; color: var(--cyan);">💬 PRUDENCE AI Assistant</div>
    </div>
    <div class="chat-messages" id="chat-messages">
      <div class="message ai">Hello! I am PRUDENCE. I've loaded your blueprint analysis. Ask me any compliance or construction questions about this plan!</div>
    </div>
    <div class="chat-input-container">
      <div class="chat-input-wrapper">
        <input type="text" id="chat-input" placeholder="Ask about room sizes, height compliance, ventilation..." onkeypress="if(event.key==='Enter') sendChatMessage()">
      </div>
      <button class="send-btn" onclick="sendChatMessage()">Send</button>
    </div>
  </div>

  <script>
    var chatHistory = [];
    var analysis = {};

    // Load from LocalStorage
    try {
      var stored = localStorage.getItem('prudence_analysis');
      if (stored) {
        analysis = JSON.parse(stored);
        renderViolations();
      }
    } catch(e) {
      console.error("Failed to parse analysis:", e);
    }

    function renderViolations() {
      var list = document.getElementById('violations-list');
      list.innerHTML = '';
      var violations = analysis.violations || [];
      if(violations.length === 0) {
        list.innerHTML = '<div style="opacity: 0.5; font-size:12px; padding:20px; text-align:center;">No violations loaded. Upload a plan first!</div>';
        return;
      }
      violations.forEach(function(v) {
        var card = document.createElement('div');
        card.className = 'violation-card';
        card.onclick = function() {
          var input = document.getElementById('chat-input');
          input.value = "Tell me more about: " + v.title;
          input.focus();
        };
        card.innerHTML = '<div class="violation-title">' + escapeHtml(v.title) + '</div>' +
                         '<div class="violation-meta">Severity: ' + escapeHtml(v.severity || 'Medium') + '</div>';
        list.appendChild(card);
      });
    }

    function escapeHtml(str) {
      if(!str) return '';
      return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function sendChatMessage() {
      var input = document.getElementById('chat-input');
      var text = input.value.trim();
      if (!text) return;
      
      input.value = '';
      var msgs = document.getElementById('chat-messages');
      msgs.innerHTML += '<div class="message user">' + escapeHtml(text) + '</div>';
      msgs.scrollTop = msgs.scrollHeight;
      
      chatHistory.push({role: 'user', content: text});
      
      fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          history: chatHistory.slice(0, -1),
          message: text,
          analysis: analysis
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          msgs.innerHTML += '<div class="message ai" style="color:#ef4444;">Error: ' + escapeHtml(data.error) + '</div>';
        } else {
          chatHistory.push({role: 'model', content: data.response});
          msgs.innerHTML += '<div class="message ai">' + escapeHtml(data.response) + '</div>';
        }
        msgs.scrollTop = msgs.scrollHeight;
      })
      .catch(err => {
        msgs.innerHTML += '<div class="message ai" style="color:#ef4444;">Failed to connect to assistant.</div>';
        msgs.scrollTop = msgs.scrollHeight;
      });
    }
  </script>
</body>
</html>
"""

# Write chat.html to paths
for path in files:
    dir_name = os.path.dirname(path)
    # Serves at /chat.html
    chat_path = os.path.join(dir_name, 'chat.html') if dir_name else 'chat.html'
    with open(chat_path, 'w', encoding='utf-8') as f:
        f.write(chat_html_content)
    print(f"Created {chat_path}")


# 2. Update toggleChat in index.html to open in a new tab & save localStorage state
for path in files:
    if not os.path.exists(path):
        continue
        
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Modify toggleChat JS
    old_toggle_chat = """window.toggleChat = function() {
          document.getElementById('chat-sidebar').classList.toggle('open');
        };"""
        
    new_toggle_chat = """window.toggleChat = function() {
          // Save the current analysis state to local storage for the chat tab to read
          if (state && state.analysis) {
            localStorage.setItem('prudence_analysis', JSON.stringify(state.analysis));
          }
          window.open('/chat.html', '_blank');
        };"""
        
    text = text.replace(old_toggle_chat, new_toggle_chat)

    # 3. Clean up UI: Remove the slide-out sidebar elements from HTML to avoid clutter
    # Find and strip out <!-- AI Chat Sidebar --> to <!-- End Content --> 
    # (actually it's better to just hide it or keep it clean)
    text = text.replace('<div id="chat-sidebar" class="chat-sidebar">', '<div id="chat-sidebar" class="chat-sidebar" style="display:none !important;">')

    # 4. Enhance 3D Wireframe Brightness & Glow CSS
    # Make borders solid thick cyan, boost scale and opacity
    old_glow_css = """      .holo-wall, .holo-roof, .holo-floor, .holo-gable {
        position: absolute;
        background: rgba(0, 243, 255, 0.05);
        border: 1px solid rgba(0, 243, 255, 0.7);
        box-shadow: 0 0 8px rgba(0, 243, 255, 0.2);
        transform-style: preserve-3d;
      }"""
      
    new_glow_css = """      .holo-wall, .holo-roof, .holo-floor, .holo-gable {
        position: absolute;
        background: rgba(0, 243, 255, 0.08);
        border: 2px solid rgba(0, 243, 255, 1);
        box-shadow: 0 0 15px rgba(0, 243, 255, 0.5), inset 0 0 15px rgba(0, 243, 255, 0.3);
        transform-style: preserve-3d;
      }"""
    text = text.replace(old_glow_css, new_glow_css)

    # Also increase brightness filter of 3D image
    text = text.replace('filter: drop-shadow(0 0 15px rgba(0, 243, 255, 0.4));', 'filter: brightness(1.3) drop-shadow(0 0 25px rgba(0, 243, 255, 0.6));')

    # 5. Fix Scroll: Revert to strict, no window scroll layout
    # Clean up overflow overrides
    text = text.replace('body { overflow: auto; }', 'body { overflow: hidden !important; }')
    text = text.replace('body {\n        overflow: auto;', 'body {\n        overflow: hidden !important;')
    
    # Ensure main has height calc and is hidden, while right has independent scroll
    text = re.sub(r'main\s*\{[^}]*\}', """main {
        display: flex;
        height: calc(100vh - 60px);
        overflow: hidden;
        position: relative;
      }""", text, count=1)

    text = re.sub(r'\.right\s*\{[^}]*\}', """.right {
        width: 380px;
        background: #0b0f13;
        flex-shrink: 0;
        height: 100%;
        overflow-y: auto;
      }""", text, count=1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"Patched {path}")
