import os
import re

file_path = 'localhost/server.py'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Add gemini_chat function before the Handler class
chat_func = """
def gemini_chat(payload: dict) -> dict:
    import google.generativeai as genai
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        return {"error": "GEMINI_API_KEY not found"}
    genai.configure(api_key=key)
    
    history = payload.get("history", [])
    message = payload.get("message", "")
    analysis = payload.get("analysis", {})
    
    system_instruction = f"You are PRUDENCE, an AI architectural assistant. You help users understand their floor plans. Here is the parsed data of the current plan: {json.dumps(analysis)[:4000]}... Keep your answers concise, helpful, and friendly. If a user asks a question about the plan, answer based on this context. Be professional."
    
    gemini_history = []
    for m in history:
        # Map user/assistant to user/model
        role = "user" if m["role"] == "user" else "model"
        gemini_history.append({"role": role, "parts": [m["content"]]})
        
    try:
        model = genai.GenerativeModel("gemini-2.5-flash", system_instruction=system_instruction)
        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(message)
        return {"response": response.text}
    except Exception as e:
        print("Gemini Chat Error:", e)
        return {"error": str(e)}

class Handler"""

text = text.replace("class Handler", chat_func)

# Modify do_POST to handle /api/chat
post_func_old = """
    def do_POST(self) -> None:
        if self.path not in {"/api/analyze", "/api/analyze-file"}:
            self.send_error(404)
            return"""

post_func_new = """
    def do_POST(self) -> None:
        if self.path not in {"/api/analyze", "/api/analyze-file", "/api/chat"}:
            self.send_error(404)
            return"""
            
text = text.replace(post_func_old, post_func_new)

# Modify do_POST logic to call gemini_chat
logic_old = """
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        except json.JSONDecodeError:
            payload = {}
        result = gemini_document_analysis(payload) if self.path == "/api/analyze-file" else nvidia_analysis(payload)
        result = apply_rule_checks(result, payload)"""

logic_new = """
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        except json.JSONDecodeError:
            payload = {}
        
        if self.path == "/api/chat":
            result = gemini_chat(payload)
        else:
            result = gemini_document_analysis(payload) if self.path == "/api/analyze-file" else nvidia_analysis(payload)
            result = apply_rule_checks(result, payload)"""

text = text.replace(logic_old, logic_new)

# Change port to 5174
text = text.replace("5173", "5174")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
    
print("server.py updated!")
