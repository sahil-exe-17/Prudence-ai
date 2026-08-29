# API Specifications, Integration Schemas & Datasets
## PRUDENCE AI — SIH 2026 Open Innovation

---

## 1. REST API Endpoints Specification

### 1.1 `POST /api/analyze-file`
Submits a blueprint file and statutory rule pack parameters for automated analysis.

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Payload:
```json
{
  "filename": "Green_Heights_Block_A.dwg",
  "jurisdiction": "BBMP 2026",
  "buildingType": "Residential High-Rise (Group A-4)",
  "rulePacks": ["DCR", "NBC 2016", "RERA Act 2016"],
  "plotAreaSqM": 1450.0,
  "proposedBuiltUpSqM": 4150.0
}
```

#### Response Payload (200 OK):
```json
{
  "status": "success",
  "score": 67,
  "summary": {
    "totalRulesEvaluated": 6,
    "passedCount": 4,
    "failedCount": 2,
    "riskLevel": "Medium Risk"
  },
  "annotations": [
    {
      "id": "01",
      "xPct": 14.5,
      "yPct": 13.0,
      "ruleId": "SETBACK-R01",
      "code": "DCR",
      "title": "Rear Setback Margin Deficit",
      "severity": "CRITICAL",
      "status": "FAIL",
      "provided": "2.40m",
      "required": "4.00m",
      "finding": "Rear setback is 1.60m short of the minimum statutory requirement of 4.00m for BBMP high-rise residential zone.",
      "remediation": "Shift the rear exterior structural wall 1.60m inward to restore required buffer space."
    },
    {
      "id": "02",
      "xPct": 33.5,
      "yPct": 16.0,
      "ruleId": "FIRE-STAIR-01",
      "code": "NBC",
      "title": "Fire Evacuation Staircase Width",
      "severity": "CRITICAL",
      "status": "FAIL",
      "provided": "0.95m",
      "required": "1.20m",
      "finding": "Staircase clear width is 0.25m below NBC 2016 Part 4 minimum requirement of 1.20m.",
      "remediation": "Expand stair flight clear width by 0.25m to satisfy NBC fire evacuation capacity."
    }
  ]
}
```

---

### 1.2 `POST /api/chat`
Interacts with the grounded Groq AI LLM assistant (`openai/gpt-oss-120b`).

#### Request Payload:
```json
{
  "message": "How do I fix the rear setback deficit on Sheet 1?",
  "history": [],
  "drawingContext": {
    "filename": "Green_Heights_Block_A.dwg",
    "score": 67,
    "violations": [
      { "id": "01", "title": "Rear Setback Deficit", "provided": "2.40m", "required": "4.00m" }
    ]
  }
}
```

---

## 2. Test Datasets & Benchmarks

| Dataset Name | Drawing Types | Description | Purpose |
| :--- | :--- | :--- | :--- |
| `Green_Heights_Block_A` | 2D DWG / Vector PDF | 12-story residential high-rise with rear setback & stair width deficits. | Benchmark validation for DCR & NBC 2016 rules. |
| `Ground_Floor_Plan` | 2D DXF / PNG | Commercial complex with ground coverage & parking deficits. | Benchmark validation for BBMP commercial bylaws. |
| `CAD_3D_BIM_Model` | 3D OBJ / GLTF | 3D architectural massing model. | Three.js 3D viewport extrusion test. |
