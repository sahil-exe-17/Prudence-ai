# Role-Based Access Control (RBAC) & Governance Plan
## PRUDENCE AI — SIH 2026 Open Innovation

---

## 1. Governance Overview
PRUDENCE AI implements a multi-tenant Role-Based Access Control (RBAC) architecture designed for municipal building approval departments (e.g., BBMP, MCGM, DDA, HMDA), private architectural firms, licensed structural engineers, and RERA regulatory bodies.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PRUDENCE RBAC ROLES                           │
├───────────────────┬───────────────────┬─────────────────┬───────────────┤
│ MUNICIPAL OFFICER │ ARCHITECT/PLANNER │ STRUCTURAL ENG  │ HOMEBUYER/RERA│
│ (Approval Officer)│ (Plan Submitter)  │ (Safety Auditor)│ (Auditor)     │
└───────────────────┴───────────────────┴─────────────────┴───────────────┘
```

---

## 2. Permissions Matrix

| Feature / Action | Municipal Examiner | Architect / Developer | Structural Engineer | Homebuyer / Public |
| :--- | :---: | :---: | :---: | :---: |
| **Upload Drawing Set** | ✓ | ✓ | ✓ | ✗ |
| **View Viewport Fitted Blueprint Canvas** | ✓ | ✓ | ✓ | ✓ |
| **Run DCR / NBC / RERA Audit Engine** | ✓ | ✓ | ✓ | ✓ |
| **View High-Precision Pin Annotations** | ✓ | ✓ | ✓ | ✓ |
| **Expand Accordion Audit Detail Cards** | ✓ | ✓ | ✓ | ✓ |
| **Consult Grounded Groq AI Assistant** | ✓ | ✓ | ✓ | ✓ |
| **Export Official Audit JSON/PDF Report** | ✓ | ✓ | ✓ | ✗ |
| **Issue Commencement Certificate (CC)** | ✓ | ✗ | ✗ | ✗ |
| **Issue Occupancy Certificate (OC)** | ✓ | ✗ | ✗ | ✗ |

---

## 3. Role Definitions & User Personas

### 3.1 Municipal Building Approval Officer (BBMP / MCGM Inspector)
- **Primary Goal**: Rapid verification of building plans against local statutory bylaws before issuing Commencement Certificates (CC).
- **Key Workflow**: Uploads submitted plan $\rightarrow$ Audits DCR setback margins & NBC fire tender access $\rightarrow$ Reviews violation pin callouts $\rightarrow$ Issues approval or conditional rejection with exact clause references.

### 3.2 Registered Architect & Urban Planner
- **Primary Goal**: Pre-submission compliance check to avoid municipal rejection and costly redesigns.
- **Key Workflow**: Uploads draft DWG/PDF $\rightarrow$ Identifies setback & stair width deficits $\rightarrow$ Consults PRUDENCE AI LLM for column grid relocation remedies $\rightarrow$ Re-uploads corrected drawing.

### 3.3 Licensed Fire & Structural Safety Engineer
- **Primary Goal**: Certification of NBC 2016 Part 4 fire evacuation standards and structural height limits.
- **Key Workflow**: Filters rule results by `NBC` pack $\rightarrow$ Verifies 1.2m stair width, 1.5m corridor width, and 24.0m permissible building height $\rightarrow$ Exports compliance report.

### 3.4 RERA Authority Inspector & Homebuyer
- **Primary Goal**: Verification of carpet area disclosures and sanction approvals.
- **Key Workflow**: Inspects unit carpet area disclosure statements $\rightarrow$ Ensures zero mismatch between marketing floor plans and approved municipal drawings.
