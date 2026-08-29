# Technical Stack & System Specification
## PRUDENCE AI — SIH 2026 Open Innovation

---

## 1. Architecture Overview
PRUDENCE AI is engineered as a modern, high-performance web application featuring a React 19 single-page client, a Python backend engine, Vercel Serverless API handlers, and Groq LLM integration.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND CLIENT (React 19 + Vite)                  │
│  - App.tsx (Main Workspace & Navigation Controller)                     │
│  - DrawingPreview (Viewport Auto-Fit Canvas & Glowing Pins)             │
│  - ThreeBuildingBackground (Three.js 3D Wireframe Canvas)              │
│  - InteractiveWorkflowSimulator & InteractiveBylawTester Components    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / REST API
┌────────────────────────────────────▼────────────────────────────────────┐
│                       BACKEND API & RULE ENGINE                         │
│  - Vercel Serverless Functions (`api/analyze-file.js`, `api/chat.js`)   │
│  - Standalone Local Python HTTP Server (`localhost/server.py:5174`)     │
│  - Statutory Rule Pack Engine (`api/rules.js`)                          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Authorization: Bearer GROQ_API_KEY
┌────────────────────────────────────▼────────────────────────────────────┐
│                    GROQ AI LLM ENGINE (`openai/gpt-oss-120b`)           │
│  - Grounded Drawing Context & Violation Mitigation Generation          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Technology Breakdown

### 2.1 Frontend Stack
- **Framework**: React 19 (`react`, `react-dom`)
- **Build System**: Vite 7.3 (`vite`, `@vitejs/plugin-react`)
- **Language**: TypeScript (`tsx`, `ts`)
- **Styling & Aesthetics**: Vanilla CSS + TailwindCSS 3.4
  - Custom design tokens: HSL dark slate palette (`#08090a`, `#111416`, `#151a1c`), warm accent (`#f26a3d`), spatial cyan (`#81b7c2`).
  - Animations: Smooth 380ms view transition keyframes (`view-transition-enter`), `.btn-crazy-glow` pill mechanics, laser scanner beam animations.
- **3D Graphics**: Three.js (`three`, `@types/three`) for interactive wireframe architectural building backgrounds.
- **Icons**: Lucide React (`lucide-react`)

### 2.2 Backend & Rule Engine
- **Serverless API (Vercel)**:
  - Node.js ESM serverless endpoints (`api/analyze-file.js`, `api/chat.js`, `api/rules.js`).
- **Local Development Server**:
  - Python 3.14 `ThreadingHTTPServer` (`localhost/server.py`) running on `127.0.0.1:5174`.
  - Serves REST endpoints for drawing file analysis and local AI chat proxying.
- **AI Engine (Groq API)**:
  - Model: `openai/gpt-oss-120b` (Primary) with `qwen/qwen3.8-27b` fallback.
  - Custom `User-Agent` request header handling to bypass Cloudflare edge restrictions.

---

## 3. Statutory Rule Packs & Domain Datasets

| Rule Pack | Authority / Code Source | Key Statutory Parameters Evaluated |
| :--- | :--- | :--- |
| **DCR** | Development Control Regulations (BBMP / DCPR 2034) | Rear setback ($\ge 4.0\text{m}$), Front setback ($\ge 6.0\text{m}$), Side setbacks ($\ge 3.0\text{m}$), FSI/FAR limit, Ground coverage %, Access road width ($\ge 6.0\text{m}$), Car parking space deficit. |
| **NBC** | National Building Code of India 2016 (Part 4) | Egress stair clear width ($\ge 1.20\text{m}$), Common corridor width ($\ge 1.50\text{m}$), Max permissible building height ($\le 24.0\text{m}$), Lift core dimension readability. |
| **RERA** | Real Estate Regulation & Development Act 2016 | Unit carpet area disclosure tolerance ($\le 1.4\%$), RERA registration status, Sanctioned plan & commencement certificate disclosures. |

---

## 4. Key Configuration Files

| File | Purpose |
| :--- | :--- |
| [package.json](file:///c:/Users/Sahil%20Lale/Downloads/PRUDENCE-main/PRUDENCE-main/package.json) | Node.js dependencies, build scripts (`npm run build`, `npm run dev`). |
| [vite.config.ts](file:///c:/Users/Sahil%20Lale/Downloads/PRUDENCE-main/PRUDENCE-main/vite.config.ts) | Vite bundler config with `/api` proxy target to `127.0.0.1:5174`. |
| [vercel.json](file:///c:/Users/Sahil%20Lale/Downloads/PRUDENCE-main/PRUDENCE-main/vercel.json) | Vercel routing configuration for serverless functions and static build outputs. |
| [.env](file:///c:/Users/Sahil%20Lale/Downloads/PRUDENCE-main/PRUDENCE-main/.env) | Environment variable declarations (`GROQ_API_KEY`, `PRUDENCE_GROQ_MODEL`). |
