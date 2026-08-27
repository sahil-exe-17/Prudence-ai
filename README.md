# 🏢 PRUDENCE AI – Architectural & Civil Blueprint Compliance Assistant

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%20%2B%20Python-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-TailwindCSS-38B2AC)](https://tailwindcss.com/)
[![Python Server](https://img.shields.io/badge/Backend-Python%20ThreadingHTTPServer-yellow)](https://docs.python.org/3/library/http.server.html)

**PRUDENCE** is an advanced AI-powered architectural and civil engineering plan compliance analysis platform. It enables real estate developers, urban planners, structural engineers, and architects to evaluate building drawings, floor plans, and site layouts against statutory urban development guidelines and local building codes (such as **DCR**, **NBC 2016**, and **RERA**).

---

## 🌟 Key Features

- 📐 **Automated Blueprint Compliance Check**: Upload CAD drawings, floor plans, or multi-sheet PDF blueprints to get instant statutory checks.
- 🏛️ **Multi-Statutory Rule Packs**:
  - **DCR (Development Control & Promotion Regulations)**: Evaluates road width/access, setbacks (rear, front, side), FSI/FAR ratios, and ground coverage.
  - **NBC 2016 (National Building Code of India)**: Evaluates fire tender access, main entrance gate width, ramp slopes, stair/corridor clear widths, plinth heights, and building height restrictions.
  - **RERA (Real Estate Regulatory Authority)**: Verifies project registration disclosures, sanctioned plan approvals, and carpet area schedules.
- 🎯 **Interactive Canvas Overlay**: Visual pinpoint markers and color-coded bounding boxes directly mapped onto uploaded floor plans for non-compliant zones.
- 🤖 **Multi-Modal AI Vision Engine**: Powered by Google Gemini 3.1 Flash / NVIDIA Llama-3.2 Vision with a reliable, deterministic local rule-check fallback engine.
- 💬 **Interactive AI Compliance Assistant**: Context-aware AI chat interface to ask questions about specific blueprint violations, mitigation steps, and statutory clauses.
- 📄 **Exportable PDF Reports**: One-click generation of audit reports complete with violation summaries, exact metric deficits, and corrective action recommendations.

---

## 📁 Repository Structure

```
Prudence-ai/
├── api/                    # Vercel serverless API handlers & rule database
│   ├── analyze-file.js     # Serverless endpoint for PDF/image plan analysis
│   ├── analyze.js          # Main API route handler
│   └── rules.js            # Comprehensive statutory rule definitions (DCR, NBC, RERA)
├── backend/                # FastAPI backend & orchestration service
│   ├── main.py             # FastAPI backend implementation
│   ├── run.py              # Server launcher
│   └── requirements.txt    # Backend Python dependencies
├── localhost/              # Standalone Python backend & server
│   ├── server.py           # ThreadingHTTPServer with Gemini/NVIDIA AI & local engine
│   ├── index.html          # Standalone client GUI
│   ├── chat.html           # Standalone chat interface GUI
│   └── ...                 # Static assets (PDF.js, jsPDF, branding logos)
├── public/                 # Static public web assets (PDF.js worker, logos)
├── scripts/                # Build serving scripts
├── src/                    # React + Vite + TypeScript application
│   ├── agents/             # Python multi-agent orchestration module
│   ├── App.tsx             # Main interactive application UI
│   ├── index.css           # Global stylesheet & Tailwind utilities
│   └── main.tsx            # Vite React entry point
├── dev-scripts/            # Internal test, patch, and verification scripts
├── .env.example            # Environment variables configuration template
├── .gitignore              # Git ignore rules
├── index.html              # Vite HTML template
├── package.json            # Node.js manifest & dependencies
├── postcss.config.js       # PostCSS configuration
├── tailwind.config.js      # Tailwind CSS styling configuration
├── tsconfig.json           # TypeScript configuration
├── vercel.json             # Vercel deployment configuration
└── vite.config.ts          # Vite bundler & backend proxy configuration
```

---

## ⚙️ Prerequisites & Setup

### Requirements
- **Node.js**: v18.x or higher
- **Python**: v3.9 or higher

### 1. Installation

Clone the repository and install the Node.js dependencies:

```bash
git clone https://github.com/sahil-exe-17/Prudence-ai.git
cd Prudence-ai
npm install
```

Install the optional Python backend dependencies:

```bash
pip install -r backend/requirements.txt
```

### 2. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Open `.env` and add your API keys:

```ini
GEMINI_API_KEY=your_gemini_api_key_here
PRUDENCE_NVIDIA_API_KEY=your_nvidia_api_key_here
```

---

## 🚀 Running the Application

### Option A: Complete Dev Stack (Recommended)
Runs both the **React Frontend** (`http://127.0.0.1:5173`) and the **Python API Backend** (`http://127.0.0.1:5174`) concurrently:

```bash
npm run dev
```

### Option B: Individual Components
- **Frontend Only**:
  ```bash
  npm run web
  ```
- **Backend API Server Only**:
  ```bash
  npm run api
  ```
- **Production Build & Preview**:
  ```bash
  npm run build
  npm run serve
  ```

---

## 🔍 API Reference & Architecture

The Python server (`localhost/server.py`) exposes three primary REST endpoints:

- `POST /api/analyze-file`: Uploads base64-encoded PDF or image plans. Triggers Gemini/NVIDIA multimodal vision analysis or falls back to local deterministic PyMuPDF text & geometrical checks.
- `POST /api/analyze`: Processes structured floor plan payloads against active DCR, NBC 2016, and RERA rule packs.
- `POST /api/chat`: Context-aware chatbot endpoint allowing interactive Q&A grounded in the active plan analysis.

---

## 🌐 Deployment

PRUDENCE is configured for seamless serverless deployment on **Vercel**:

```bash
npx vercel
```

The repository includes `vercel.json` and serverless API handlers in `/api` to allow instant edge deployment without requiring a persistent container.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue for feature requests or building-code additions.

---

## 📄 License

This project is licensed under the MIT License.
