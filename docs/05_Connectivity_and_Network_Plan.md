# Connectivity, Network Architecture & Hybrid Deployment
## PRUDENCE AI — SIH 2026 Open Innovation

---

## 1. Hybrid Network Architecture

PRUDENCE AI is architected for both cloud-hosted environments (Vercel Serverless Production) and offline/on-premise municipal intranet setups.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          HYBRID NETWORK MODEL                           │
├───────────────────────────────────┬─────────────────────────────────────┤
│      PRODUCTION CLOUD (Vercel)    │     LOCAL INTRANET (On-Premise)     │
│  - Endpoint: prudence-ai.vercel.app│  - Endpoint: 127.0.0.1:5173 / 5174  │
│  - Edge Functions: /api/*         │  - Python Server: ThreadingHTTPServer│
│  - Global CDN & Assets            │  - Air-gapped Municipal Network     │
└───────────────────────────────────┴─────────────────────────────────────┘
```

---

## 2. API Endpoint Specification & Port Mapping

| Protocol | Path / URL | Host / Port | Functionality |
| :--- | :--- | :--- | :--- |
| **HTTP / REST** | `/api/analyze-file` | `localhost:5174` / Vercel Edge | Accepts drawing file payload and rule selection; returns compliance evaluation & pin annotations. |
| **HTTP / REST** | `/api/chat` | `localhost:5174` / Vercel Edge | Proxies messages to Groq AI LLM (`openai/gpt-oss-120b`) with active drawing context. |
| **HTTP / REST** | `/api/rules` | `localhost:5174` / Vercel Edge | Returns statutory rule packs (DCR, NBC 2016, RERA Act 2016). |
| **WebSocket / HMR**| `ws://localhost:5173` | `localhost:5173` | Vite development hot module reloading. |

---

## 3. Resilience, Fallback & Offline Capabilities

### 3.1 Groq API Fallback Strategy
If external internet connectivity to the Groq API Cloud is unavailable or rate-limited:
1. The backend automatically switches to local rule-based heuristic generation.
2. The AI Chat component presents structured mitigation templates derived from offline DCR / NBC statutory databases without crashing.

### 3.2 CORS & Security Headers
To ensure secure cross-origin communication between the Vite client (`http://localhost:5173`) and the Python server (`http://localhost:5174`):
```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0
```
