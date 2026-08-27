from datetime import datetime
from typing import Literal

from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


Jurisdiction = Literal["bbmp-2026", "mcgm-2034", "ubbl-2016"]


class AnalysisRequest(BaseModel):
    filename: str | None = None
    jurisdiction: Jurisdiction = "bbmp-2026"


app = FastAPI(
    title="PRUDENCE API",
    description="Demo API for Indian construction compliance analysis.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


JURISDICTION_LABELS = {
    "bbmp-2026": "Bengaluru BBMP 2026",
    "mcgm-2034": "Mumbai DCPR 2034",
    "ubbl-2016": "Delhi UBBL 2016",
}


def demo_payload(filename: str | None, jurisdiction: Jurisdiction):
    drawing_name = filename or "tower-a_site-plan.pdf"
    label = JURISDICTION_LABELS[jurisdiction]

    return {
        "document": drawing_name,
        "jurisdiction": label,
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "score": 78,
        "status": "conditional-pass",
        "reasoning": [
            {
                "title": "Parsing submitted drawing set",
                "detail": "Detected site plan, floor plate, setbacks, parking schedule, and FAR summary.",
                "state": "complete",
            },
            {
                "title": f"Mapping clauses from {label}",
                "detail": "Matched height band, road width, occupancy class, and residential tower controls.",
                "state": "complete",
            },
            {
                "title": "Checking dimensional compliance",
                "detail": "Rear setback and visitor parking counts require revision before sanction.",
                "state": "active",
            },
            {
                "title": "Preparing sanction-ready summary",
                "detail": "Generating clause citations, markups, and remediation order.",
                "state": "queued",
            },
        ],
        "violations": [
            {
                "id": "V-102",
                "severity": "High",
                "clause": "Setback control",
                "location": "North-west rear edge",
                "finding": "Rear setback shown as 3.1 m against required 4.5 m.",
                "recommendation": "Shift podium line inward by 1.4 m or revise massing envelope.",
            },
            {
                "id": "V-207",
                "severity": "Medium",
                "clause": "Parking schedule",
                "location": "Basement B1/B2",
                "finding": "Visitor parking shortfall of 8 bays for declared dwelling mix.",
                "recommendation": "Convert surplus service bays or add mechanical stack allocation.",
            },
            {
                "id": "V-314",
                "severity": "Low",
                "clause": "Fire tender access",
                "location": "East access loop",
                "finding": "Turning radius label is missing on the submitted sheet.",
                "recommendation": "Add dimension callout and fire appliance sweep note.",
            },
        ],
        "metrics": [
            {"label": "FAR", "value": "2.71 / 2.75", "state": "pass"},
            {"label": "Setbacks", "value": "2 of 3 pass", "state": "fail"},
            {"label": "Parking", "value": "92%", "state": "warn"},
            {"label": "Fire Access", "value": "Pending label", "state": "warn"},
        ],
    }


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/analyze")
async def analyze(request: AnalysisRequest):
    return demo_payload(request.filename, request.jurisdiction)


@app.post("/api/analyze-upload")
async def analyze_upload(file: UploadFile, jurisdiction: Jurisdiction = "bbmp-2026"):
    return demo_payload(file.filename, jurisdiction)

