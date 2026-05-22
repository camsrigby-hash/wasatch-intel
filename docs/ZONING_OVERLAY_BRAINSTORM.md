# Zoning Color Overlay — Future Feature Brainstorm

**Logged**: May 2026, post 18b-2d-2 ship.
**Status**: Future feature, not yet phase-numbered. Slots after Phase 14 (vector tiles) and Phase 18b-3 (D1 load) at minimum.
**Owner**: Cameron Rigby.

## Core idea

Toggleable map layer that colors every parcel by zoning intent, normalized across jurisdictions. Two modes: Current (today's zoning) and Future (GP/FLU vision). User scans the entire Wasatch Front + Tooele Valley and sees commercial corridors, industrial plans, high-density residential targets in the same color language regardless of whether the underlying code is "MU-TC" in Herriman or "Mixed Use Activity Center" in Lehi.

## Why it's valuable

Prospecting power = comparing the two layers:
- RR-5 parcel sitting on Future "Commercial Mixed Use" tile → rezone-and-flip thesis encoded visually
- Agricultural corridor along Future High Density Residential → annexation/rezone pressure
- Open Space current sitting in Future Light Industrial → planning conflict, watch hearings

Scoring engine already encodes spread in numbers (zoning dimension → gap score). Overlay makes it eyeballable instead of requiring you to know which parcel ID to pull.

## 8-bucket taxonomy (proposed)

| Bucket | Suggested color | Absorbs |
|---|---|---|
| Low-density residential | Pale yellow / cream | RR-5, A-20 residential, R-1-20+, Hillside/Rural, Agricultural Residential, Low Density Residential |
| Medium-density residential | Yellow | R-1-10, R-1-7, Single Family Residential, Medium Density Residential |
| High-density residential | Orange | R-2, R-3, R-M, High Density Residential, multi-family |
| Commercial | Red | C-1, C-2, CG, CC, Commercial, Commercial Mixed Use, Retail |
| Mixed-use | Pink / magenta | MU, MU-TC, Mixed Use, Mixed Use Towne Center, Activity Center, TOD |
| Industrial | Purple | I-1, I-2, M-1, Light Industrial, Heavy Industrial, Business Park, Manufacturing |
| Open / agricultural / special | Green | Open Space, Parks, Agricultural (non-residential A-20), Resort/Rec |
| Public / institutional | Blue | Public, Institutional, Schools, Military, Quasi-Public, Utilities |

8 is the sweet spot. Fewer loses signal. More creates color confusion.

## Mapping table (the deliverable)

Lives in `tooele-land-intel` as CSV or JSON:
