# Indian Building Bylaws & Statutory Domain Knowledge Reference
## PRUDENCE AI — SIH 2026 Open Innovation

---

## 1. Statutory Frameworks Supported

PRUDENCE AI encodes Indian municipal building codes and statutory regulations into executable digital rule packs.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  INDIAN BUILDING STATUTORY CODES                        │
├──────────────────────────────┬──────────────────────────────┬───────────┤
│ DCR (Development Control)    │ NBC 2016 (Fire & Life Safety)│ RERA 2016 │
│ - BBMP 2026 (Bengaluru)      │ - Part 4 Table 7 (Stairs)    │ - Carpet  │
│ - MCGM DCPR 2034 (Mumbai)    │ - Clause 4.3 (Corridors)     │   Area    │
│ - DDA UBBL 2016 (Delhi)      │ - Clause 6.1 (Height Limit)  │   Audit   │
└──────────────────────────────┴──────────────────────────────┴───────────┘
```

---

## 2. Key Statutory Calculation Formulas

### 2.1 Floor Space Index (FSI) / Floor Area Ratio (FAR)
$$\text{FSI} = \frac{\text{Total Proposed Built-Up Area (sq.m)}}{\text{Total Net Plot Area (sq.m)}}$$

- **BBMP Standard Limit**: Max permissible FSI = $2.50$.
- **PRUDENCE Threshold**: Violations flagged if $\text{FSI} > 2.50$.

### 2.2 Ground Coverage Percentage
$$\text{Ground Coverage \%} = \left( \frac{\text{Building Footprint Area}}{\text{Total Plot Area}} \right) \times 100$$

- **DCPR 2034 Limit**: Max permissible ground coverage = $45.0\%$.

### 2.3 Rear Setback Margin Calculation
For building height $H$:
$$\text{Min Rear Setback (m)} = \max\left(3.0, \; 3.0 + 0.3 \times (H - 10.0)\right)$$

- **PRUDENCE Test Rule**: Proposed Rear Setback $= 2.40\text{m}$. Required $= 4.00\text{m}$.
- **Result**: `FAIL` (Setback deficit $= 1.60\text{m}$).

---

## 3. Statutory Rule Audit Table

| Code | Clause ID | Parameter Description | Minimum Required | Violation Condition | Action Required |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DCR** | `SETBACK-R01` | Rear Plot Boundary Setback | $4.00\text{m}$ | $< 4.00\text{m}$ | Shift rear wall $1.60\text{m}$ inward to restore rear buffer. |
| **DCR** | `SETBACK-F01` | Front Boundary Setback | $6.00\text{m}$ | $< 6.00\text{m}$ | Align front facade line with road widening line. |
| **NBC** | `FIRE-STAIR-01`| Fire Evacuation Stair Width | $1.20\text{m}$ | $< 1.20\text{m}$ | Expand flight width by $0.25\text{m}$; remove riser obstructions. |
| **NBC** | `FIRE-CORR-01` | Common Circulation Corridor | $1.50\text{m}$ | $< 1.50\text{m}$ | Widen main lobby corridor to satisfy NBC evacuation capacity. |
| **NBC** | `HEIGHT-MAX-01`| Maximum Building Height | $24.00\text{m}$ | $> 24.00\text{m}$ | Reduce top structural headroom or submit high-rise NOC. |
| **RERA**| `CARPET-DISC-01`| Unit Carpet Area Tolerance | $\pm 1.40\%$ | $> 1.40\%$ | Re-align unit partition walls to match sanctioned area. |
