import os

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

    # Expose AI functions to window
    injection = """
        // --- AI FEATURES LOGIC ---
        var chatHistory = [];
        window.toggleChat = function() {
          document.getElementById('chat-sidebar').classList.toggle('open');
        };
        window.toggle3D = function() {
          document.body.classList.toggle('mode-3d');
        };
        window.sendChatMessage = function() {
"""
    # Replace the old logic
    old_logic = """
        // --- AI FEATURES LOGIC ---
        var chatHistory = [];
        function toggleChat() {
          document.getElementById('chat-sidebar').classList.toggle('open');
        }
        function toggle3D() {
          document.body.classList.toggle('mode-3d');
        }
        
        function applyAutoFix(btn, event) {
"""
    new_logic = """
        // --- AI FEATURES LOGIC ---
        var chatHistory = [];
        window.toggleChat = function() {
          document.getElementById('chat-sidebar').classList.toggle('open');
        };
        window.toggle3D = function() {
          document.body.classList.toggle('mode-3d');
        };
        
        function applyAutoFix(btn, event) {
"""
    
    if 'window.toggle3D =' not in text:
        text = text.replace(old_logic, new_logic)
        # also fix sendChatMessage
        text = text.replace('function sendChatMessage() {', 'window.sendChatMessage = function() {')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'Patched {path}')
