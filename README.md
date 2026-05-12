# SnapseX

A bioinformatics platform for analyzing Huntingtin (HTT) CAG repeat mutations and predicting disease risk, onset age, and drug interactions.

## Overview

Huntington's disease (HD) is caused by expansion of a trinucleotide CAG repeat in the HTT gene. SnapseX automates the detection and analysis of these mutations using computational methods to:

- Detect and classify CAG repeats
- Predict disease risk and onset age
- Model protein aggregation and drug interactions
- Simulate family pedigrees and intergenerational expansion
- Analyze protein structure accessibility

## Key Features

1. **HTT Mutation Detection** - Context-Free Grammar (CFG) parser for CAG repeat analysis
2. **Fitness Landscape** - Models cellular fitness across CAG ranges (6–80+)
3. **Clinical Risk Scoring** - Continuous risk classification with penetrance estimates
4. **Onset Age Prediction** - Based on Langbehn et al. (2004) exponential model
5. **Drug Interaction Simulator** - Models binding affinity and aggregation kinetics
6. **Protein Structure Analysis** - ESMFold integration for drug accessibility scoring
7. **Heredity Modeling** - Simulates intergenerational CAG expansion patterns

## Installation

### Prerequisites
- Python 3.9+
- Node.js 18+

### Clone & Setup

```bash
git clone https://github.com/Ashwot-Acharya/SnapseX.git
cd SnapseX
```

**Backend:**
```bash
cd Backend
python -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate (Windows)
pip install -r requirements.txt
python app.py
```
Backend runs on `http://localhost:5000`

**Frontend:**
```bash
cd Frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`

### Environment Variables
Create `.env.local` in the Frontend folder:
```
VITE_API_BASE=http://localhost:5000/api
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/htt/detect` | Analyze HTT sequence |
| GET | `/api/htt/landscape` | Get fitness/risk data |
| GET | `/api/htt/classify/<n>` | Classify CAG count |
| POST | `/api/htt/drug/simulate` | Simulate drug binding |
| POST | `/api/htt/drug/kinetics` | Aggregation kinetics |
| POST | `/api/htt/drug/accessibility` | Protein accessibility |
| POST | `/api/htt/interactions/simulate` | Gene expression dynamics |
| POST | `/api/htt/heredity/simulate` | Family pedigree simulation |

## Technology Stack

- **Backend:** Flask, Python 3.9+
- **Frontend:** React 19.2, Vite, D3.js, Recharts
- **External APIs:** ESMFold (Meta), AlphaFold DB
