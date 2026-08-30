# 🚀 PRUDENCE AI — Complete Tech Stack & Architecture

> **Multi-Statutory Building Plan Compliance Engine**  
> Built for **Smart India Hackathon 2026 (SIH 2026) — Open Innovation**

---

## 📐 Overview

**PRUDENCE AI** automates civil and architectural building blueprint compliance verification against Indian Statutory Standards (**DCR**, **NBC 2016 Part 4 Fire & Life Safety**, and **RERA 2016**). It combines **Multi-Modal Vision AI** with a **Deterministic Local Geometry Engine**, rendering interactive canvas overlays with glowing violation pinpoints and 3D WebGL spatial projections.

---

## 💻 Tech Stack Summary

### 1. Frontend Client
- **Framework**: [React 19](https://react.dev/) (`react`, `react-dom`)
- **Language**: [TypeScript 5.9](https://www.typescriptlang.org/) (`.tsx`, `.ts`)
- **Build Tool**: [Vite 7.1](https://vitejs.dev/) (`vite`, `@vitejs/plugin-react`)
- **3D Engine**: [Three.js](https://threejs.org/) (`three`, `@types/three`) — 3D wireframe spatial architectural background model ([`ThreeBuildingBackground.tsx`](file:///c:/Users/Sahil%20Lale/Downloads/PRUDENCE-main/PRUDENCE-main/src/components/ThreeBuildingBackground.tsx))
- **PDF Rendering Engine**: [PDF.js](https://mozilla.github.io/pdf.js/) (`pdfjs-dist`) — Parses vector blueprint sheets directly onto interactive HTML5 visual canvases with pin coordinate markers
- **Styling**: TailwindCSS 3.4 + Custom Vanilla CSS (`index.css` with HSL dark slate palette `#08090a`, `#81b7c2`, `#f26a3d`)
- **Animations**: Framer Motion 13 (`framer-motion`), morph text, laser scanners, gooey search filters
- **Icons**: Lucide React (`lucide-react`)

### 2. Dual Backend & Server System
- **Local Development API**: Python 3.x `ThreadingHTTPServer` / `FastAPI` ([`localhost/server.py`](file:///c:/Users/Sahil%20Lale/Downloads/PRUDENCE-main/PRUDENCE-main/localhost/server.py)) running on `127.0.0.1:5174`
- **Serverless API**: Node.js ESM Vercel Serverless Functions ([`api/analyze-file.js`](file:///c:/Users/Sahil%20Lale/Downloads/PRUDENCE-main/PRUDENCE-main/api/analyze-file.js), [`api/chat.js`](file:///c:/Users/Sahil%20Lale/Downloads/PRUDENCE-main/PRUDENCE-main/api/chat.js))
- **PDF & Geometry Parser**: PyMuPDF (`fitz`) in Python + custom regex line segment & text bounding box extractor

### 3. Dual-Engine AI Architecture
- **Vision AI Engine**: **Google Gemini 3.1 Flash** / **OpenAI GPT-4o-mini** (multi-modal drawing & sheet title block extraction + $(x, y)$ percentage pin coordinate mapping)
- **Statutory Reasoning**: **Groq LLM (`llama-3.3-70b-versatile`)** for high-speed compliance reasoning, deficit metric calculation, and mitigation plan generation
- **Deterministic Offline Fallback Engine**: Pure Python/JS local rule evaluation logic ensuring 100% offline uptime even if cloud LLM APIs are disconnected

---

## 🏛️ Statutory Rule Coverage

| Authority / Standard | Evaluated Rules & Metrics | Threshold Baseline |
| :--- | :--- | :--- |
| **DCR** | Plot Setbacks (Front, Rear, Side) | Min 3.0m - 6.0m depending on plot height |
| **DCR** | FSI / FAR Ratio & Ground Coverage | Permissible limits (1.50 - 2.50 FSI; 40% - 60% coverage) |
| **DCR** | Access Road Width | Minimum 6.0m public access road |
| **NBC 2016** | Fire Tender Entrance Gate | Minimum clear width 6.0m; headroom $\ge 4.5\text{m}$ |
| **NBC 2016** | Ramp Slopes & Clear Widths | Maximum slope 1:10; staircase width $\ge 1.5\text{m}$ |
| **NBC 2016** | Building Plinth Elevation | Minimum 450 mm above finished ground level |
| **RERA 2016** | Carpet Area Verification | Unit carpet disclosure schedule tolerance $\le 1.4\%$ |

---

## ⚡ Quick Start

```bash
# 1. Clone repository
git clone https://github.com/sahil-exe-17/Prudence-ai.git
cd Prudence-ai

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Start full application (React Web + Python API Server)
npm run dev
```

- **Frontend Application**: `http://127.0.0.1:5173`
- **Python API Server**: `http://127.0.0.1:5174`
