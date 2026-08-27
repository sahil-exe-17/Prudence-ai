# PRUDENCE

PRUDENCE is a live demo app for Indian construction compliance review:

- React + TailwindCSS frontend
- FastAPI demo analysis API
- PDF upload/preview workflow
- Agent reasoning trace, violation list, and compliance score
- Codex-style orchestration proof in `src/agents/orchestrator.py`

## Run locally

```bash
npm install
python -m pip install --target .python -r backend/requirements.txt
npm run dev
```

Frontend: http://127.0.0.1:5173  
API: http://127.0.0.1:8000

For optional live vision analysis, create a local `.env` file:

```text
GEMINI_API_KEY=your_key_here
PRUDENCE_GEMINI_MODEL=gpt-4o-mini
```

You can also open the built demo directly after `npm run build`:

```text
dist/index.html
```
