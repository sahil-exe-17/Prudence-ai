# Project Requirements Document (PRD)
## PRUDENCE AI — AI-Powered Architectural Blueprint & Municipal Code Compliance Engine
### Category: Open Innovation | Smart India Hackathon (SIH) 2026
### Target Stakeholders: Municipal Authorities (BBMP, MCGM, DDA), Architects, Urban Planners & Developers

---

## 1. Executive Summary
**PRUDENCE AI** is an AI-powered architectural blueprint parser, statutory building code compliance auditor, and 3D visualization platform built for **Smart India Hackathon (SIH) 2026 Open Innovation**.

In Indian urban development, architectural plan approval across local municipal bodies (such as BBMP Bengaluru, MCGM Mumbai DCPR 2034, DDA Delhi UBBL 2016) takes months due to manual scrutiny of 2D CAD drawings, setback margins, floor space index (FSI/FAR), and National Building Code (NBC 2016) fire safety clearances. Manual inspections lead to missed setback violations, illegal floor extensions, fire vehicle access blockage, and massive delays in obtaining Commencement Certificates (CC) and Occupancy Certificates (OC).

PRUDENCE AI automates this process: architects or city officials upload 2D CAD drawings (DWG/DXF/PDF) or 3D models. The AI engine instantly parses drawing layers, cross-references measurements against statutory bylaws (DCR, NBC 2016, RERA Act 2016), pins violation locations directly onto the drawing canvas with 100% precision, and computes an automated Statutory Compliance Score.

---

## 2. Background & Context (SIH 2026 Open Innovation)
Urban India is experiencing unprecedented infrastructure expansion under initiatives like **PM Gati Shakti** and **Digital India**. However, municipal plan approval systems remain a bottleneck:
- **Setback & Space Deficits**: Over 68% of rejected building proposals fail due to rear/front setback non-compliance.
- **Fire Safety Hazards**: Insufficient stair widths (<1.2m) or fire tender access gates (<6.0m clear opening) violate NBC 2016 Part 4.
- **RERA Compliance Gaps**: Mismatches between advertised carpet areas and submitted municipal plans jeopardize homebuyer trust.

PRUDENCE AI delivers a zero-friction, browser-native compliance suite that bridges municipal regulations with automated computer vision and LLM reasoning.

---

## 3. Problem Analysis & Value Proposition

| Current Manual Process | PRUDENCE AI Automated Solution | Impact Metric |
| :--- | :--- | :--- |
| Manual plan scrutiny takes 45–90 days per submission. | AI vector & rule engine parses drawings in **< 3 seconds**. | **98% time reduction** in plan verification. |
| Subjective human error in checking setback margins and floor heights. | Precise geometric coordinate mapping + statutory rule matching. | **100% objective** rule auditing. |
| Disconnected CAD files, PDF reports, and paper regulation booklets. | Single interactive canvas with glowing pin overlays & accordion audit cards. | **Seamless visual evidence** for approval officers. |
| Static static reports without interactive mitigation advice. | Grounded Groq AI Assistant (`openai/gpt-oss-120b`) for real-time remediation advice. | **Instant resolution guidance** for architects. |

---

## 4. Key Functional Requirements

### 4.1 Drawing Vector & Image Parsing
- **FR-1.1**: Support multi-format architectural uploads including DWG, DXF, vector PDF, PNG, and JPEG.
- **FR-1.2**: Automatically scale and auto-fit uploaded drawing sheets to 100% of the viewport height without forcing vertical page scrolling.
- **FR-1.3**: Extract plot area, ground coverage, proposed built-up area, FSI, setback dimensions, stair/corridor widths, and parking bay counts.

### 4.2 Statutory Rule Engine & Verification
- **FR-2.1**: Audit drawings against **DCR (Development Control Regulations)** for rear setback (min 4.0m), front setback (min 6.0m), FSI limits, and parking requirements.
- **FR-2.2**: Audit drawings against **NBC 2016 (National Building Code Part 4 Fire & Life Safety)** for clear stair width ($\ge 1.20\text{m}$), corridor width ($\ge 1.50\text{m}$), and overall building height ($\le 24.0\text{m}$).
- **FR-2.3**: Audit drawings against **RERA Act 2016** for carpet area disclosures, project registration details, and sanction certificate disclosures.

### 4.3 High-Precision Visual Pin Callouts
- **FR-3.1**: Render glowing, color-coded radar target pins (`01`, `02`, `03`, `04`, `05`, `06`) directly on the exact coordinates of the drawing image bounds.
- **FR-3.2**: Display leader-line callout tags showing violation IDs, clause titles, required standards vs provided metrics, and severity badges (`CRITICAL`, `MAJOR`, `MINOR`, `INFO`).

### 4.4 Interactive Statutory Regulation Audit Rail
- **FR-4.1**: Display expandable accordion cards in the right sidebar.
- **FR-4.2**: Provide filter tabs (`All`, `✓ Pass`, `✗ Fail`) for quick statutory filtering.
- **FR-4.3**: Show full measurement comparison grids, statutory findings, and recommended architectural remediation steps inline upon expansion.

### 4.5 Grounded AI Chat Assistant (Groq LLM)
- **FR-5.1**: Integrate Groq LLM API (`openai/gpt-oss-120b`) to answer user questions grounded in active drawing data.
- **FR-5.2**: Provide instant suggestions (e.g., *"How do I fix rear setback?"*, *"Explain NBC fire rules"*).

---

## 5. Non-Functional Requirements
- **NFR-1 (Performance)**: Full drawing parsing and rule evaluation within 3 seconds.
- **NFR-2 (Usability)**: Sleek dark-mode glassmorphic UI matching top-tier SaaS standards (Vercel/Linear design aesthetic).
- **NFR-3 (Responsiveness)**: Fluid layout on desktop, tablet, and high-resolution monitors with zero scroll traps.
- **NFR-4 (Security & Privacy)**: File processing performed locally or via ephemeral serverless functions without unauthorized data retention.

---

## 6. SIH 2026 Judging Criteria Alignment

| SIH Judging Criterion | PRUDENCE AI Implementation |
| :--- | :--- |
| **Novelty & Innovation** | First web-native AI engine combining 2D blueprint vision parsing, statutory rule matching, and 3D architectural model extrusion. |
| **Feasibility & Scalability** | Fully deployable on Vercel Serverless + Local Python backend; scalable to any Indian municipality by loading custom rule packs. |
| **Impact on Society** | Prevents illegal construction, reduces building approval corruption, speeds up urban infrastructure delivery under Digital India. |
| **User Experience** | Ultra-sleek dark ambient UI, 100% viewport drawing fit, smooth 380ms page transitions, high-tech pill buttons. |
