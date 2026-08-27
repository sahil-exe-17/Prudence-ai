import os

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

for path in ['localhost/index.html', 'vercel-deploy/index.html', 'prudence-app.html', 'prudence-test.html']:
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
        
    if 'id="chat-sidebar"' not in text:
        text = text.replace('</main>', html_add + '\n      </main>')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f'Injected chat HTML into {path}')
    else:
        print(f'{path} already has chat HTML')
