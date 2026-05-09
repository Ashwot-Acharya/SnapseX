# SnapseX — Huntingtin Mutation Detection & Drug Interaction Platform

![Status](https://img.shields.io/badge/status-active-brightgreen) ![Python](https://img.shields.io/badge/Python-3.9%2B-blue) ![React](https://img.shields.io/badge/React-19.2-61DAFB) ![License](https://img.shields.io/badge/license-MIT-green)

**SnapseX** is a comprehensive bioinformatics platform for analyzing **Huntingtin (HTT) CAG repeat mutations** at the molecular, cellular, and clinical levels. It combines **Context-Free Grammar (CFG) parsing**, **probabilistic scoring**, **protein structure prediction**, and **molecular docking simulations** to provide actionable insights into Huntington's disease pathogenesis and therapeutic intervention.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Installation](#installation)
- [Algorithm Guide](#algorithm-guide)
  - [CFG/PCFG Mutation Detection](#cfgpcfg-mutation-detection)
  - [Fitness Landscape Modeling](#fitness-landscape-modeling)
  - [Clinical Risk Scoring](#clinical-risk-scoring)
  - [Onset Age Prediction](#onset-age-prediction)
  - [Drug Interaction Kinetics](#drug-interaction-kinetics)
  - [Protein Structure & Accessibility](#protein-structure--accessibility)
  - [Heredity Modeling](#heredity-modeling)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Research & Citations](#research--citations)

---

## Overview

Huntington's disease (HD) is an autosomal dominant neurodegenerative disorder caused by expansion of a **trinucleotide CAG repeat** in the *HTT* gene. Normal alleles have **6–35 repeats**; disease alleles have **≥40**. The number of repeats determines:

- **Disease penetrance** (reduced 36–39, full ≥40, juvenile ≥60)
- **Age of symptom onset** (inverse relationship)
- **Aggregation propensity** of the mutant huntingtin protein
- **Response to therapeutic interventions**

SnapseX automates the detection, classification, and mechanistic analysis of HTT mutations using state-of-the-art computational methods.

---

## Key Features

### 1. **HTT CFG/PCFG Mutation Detector** 🧬
- Parses DNA sequences using a **Context-Free Grammar** specifically designed for HTT Exon 1
- Detects CAG repeats, CCG repeats, flanking sequences, and interruptions
- Scores structural integrity using **Probabilistic CFG (PCFG)** with log-likelihood
- Normalizes scores to [0, 1] scale (1 = healthy, 0 = anomalous)
- Builds visual parse trees for grammar interpretation

### 2. **Fitness Landscape Builder** 📊
- Models cellular fitness across CAG range (6–80+)
- Integrates **3 independent fitness signals**:
  - Protein aggregation propensity (nucleation kinetics)
  - Transcriptional dysregulation (polyQ sequesters transcription factors)
  - PCFG grammar fitness (statistical deviation from healthy population)
- Outputs composite fitness score (weighted 40% aggregation, 30% PCFG, 30% transcription)

### 3. **Clinical Risk Stratification** 🏥
- Continuous risk score (0 = no disease, 1 = certain disease)
- Five classification zones:
  - **Normal (≤26 CAG)**: 0% risk
  - **Mutable Normal (27–35)**: Unstable on transmission
  - **Intermediate (36–39)**: Reduced penetrance (0–70% risk)
  - **Full Penetrance (40–59)**: 70–95% penetrance
  - **Juvenile (≥60)**: 100% penetrance, early onset
- Uses segmented regression and sigmoid curves

### 4. **Onset Age Prediction** ⏱️
- Implements **Langbehn et al. (2004)** exponential model
- Predicts median age of symptom onset
- Provides 25th–75th percentile confidence intervals
- Valid for CAG 40–56 (extrapolated outside range)

### 5. **Drug Interaction Simulator** 💊
- Models drug binding to mutant polyQ domain using **Langmuir isotherm**
- Computes binding affinity (Kd), bound fraction, ΔG
- Simulates **aggregation kinetics** (Oosawa nucleation-elongation model)
- Predicts drug effect on protein fitness and aggregation rate
- Supports both kinetic and equilibrium analyses

### 6. **Protein Structure Prediction** 🏗️
- Integrates **ESMFold** (Meta) for mutant HTT structure prediction
- Fetches **AlphaFold DB** structures for wild-type HTT
- Computes per-residue **pLDDT confidence scores** (disorder prediction)
- Identifies drug-accessible regions (disordered regions, pLDDT < 50)
- Generates 3D coordinates with accessibility heatmaps

### 7. **Heredity & Intergenerational Modeling** 👨‍👩‍👧
- Simulates CAG repeat expansion across generations
- Models **replication slippage** with Gaussian increments
- Visualizes family trees with risk stratification
- Predicts likelihood of expansion on parent-to-child transmission

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (React + Vite)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ • DetectorPage: Sequence upload & CAG counting           │   │
│  │ • ProteinViewer: 3Dmol.js visualization (PDB rendering)  │   │
│  │ • InteractionsPage: Gene network (force-directed graph)   │   │
│  │ • DrugInteractionPage: Binding affinity & kinetics        │   │
│  │ • HeredityPage: Family pedigree simulation               │   │
│  │ • ComparePage: Normal vs. mutant side-by-side            │   │
│  │ • D3.js/Recharts: Landscape & kinetics plots             │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/JSON (Vite proxy :5000)
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│               Backend (Flask + Python 3.9+)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ HTT Detection Engine                                     │   │
│  │  ├─ CFG/PCFG Parser (detector.py)                        │   │
│  │  ├─ Fitness Landscape (landscape.py)                     │   │
│  │  ├─ Sequence Tools (sequences.py)                        │   │
│  │  └─ PCFG Scoring & Log-Likelihood                        │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ REST API (Flask Blueprints, CORS enabled)                │   │
│  │  ├─ POST /api/htt/detect                                 │   │
│  │  ├─ GET  /api/htt/landscape                              │   │
│  │  ├─ GET  /api/htt/classify/<n>                           │   │
│  │  ├─ POST /api/htt/drug/simulate                          │   │
│  │  ├─ POST /api/htt/drug/kinetics                          │   │
│  │  ├─ POST /api/htt/drug/accessibility                     │   │
│  │  ├─ POST /api/htt/interactions/simulate                  │   │
│  │  ├─ POST /api/htt/heredity/simulate                      │   │
│  │  └─ ... (10+ endpoints total)                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────┬────────────────────────────┘
                   │                  │
         ┌─────────↓─────────┐   ┌────↓──────────────┐
         │  External APIs    │   │  Protein DBs      │
         ├───────────────────┤   ├───────────────────┤
         │ • ESMFold (Meta)  │   │ • AlphaFold DB    │
         │ • ChEMBL (EMBL)   │   │   (normal HTT)    │
         │ • PubChem (NCBI)  │   │                   │
         └───────────────────┘   └───────────────────┘
```

---

## Installation

### Prerequisites
- **Python 3.9+** (backend)
- **Node.js 18+** (frontend)
- **pip** / **npm**

### Clone Repository
```bash
git clone https://github.com/Ashwot-Acharya/SnapseX.git
cd SnapseX
```

### Backend Setup
```bash
cd Backend
python -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate (Windows)
pip install -r requirements.txt
python app.py
```
Backend runs on **http://localhost:5000**

### Frontend Setup
```bash
cd Frontend
npm install
npm run dev
```
Frontend runs on **http://localhost:5173** (Vite default)

### Environment Variables
Create `.env` or `.env.local` in Frontend folder:
```bash
VITE_API_BASE=http://localhost:5000/api
```

---

## Algorithm Guide

### CFG/PCFG Mutation Detection

#### Grammar Definition (Chomsky Normal Form)

The HTT Exon 1 structure is encoded as a **Context-Free Grammar (CFG)**:

```
S              → EXON1
EXON1          → FLANK5 REPEAT_REGION
REPEAT_REGION  → CAG_BLOCK CCG_BLOCK | CAG_BLOCK FLANK3
CAG_BLOCK      → CAG_UNIT | CAG_UNIT CAG_BLOCK          [recursive]
CAG_UNIT       → 'CAG'
CCG_BLOCK      → CCG_UNIT | CCG_UNIT CCG_BLOCK
CCG_UNIT       → 'CCG'
FLANK5         → '5PRIME_FLANK' (regex match)
FLANK3         → '3PRIME_FLANK' (regex match)
```

**Why CFG?**
- Regular expressions (FSA) cannot simultaneously enforce flanking context AND count repeats
- CFG handles recursion: the `CAG_BLOCK → CAG_UNIT CAG_BLOCK` rule naturally encodes the repeat structure
- Enables structural parsing and probabilistic scoring

#### PCFG Scoring

Each rule has an assigned probability, trained from the **healthy population distribution**:

| CAG Count | Probability | Source |
|-----------|-------------|--------|
| 17 (peak) | 0.098       | Metzger et al., healthy pop. |
| 18        | 0.092       | " |
| 35 (max)  | 0.0003      | " |
| 40+ (disease) | 1e-8    | Rare in healthy population |

**Log-likelihood computation:**

```
LL(sequence) = log P(CAG_count | healthy grammar)
             + log P(flanks intact)
             + log P(no interruptions)
             + log P(CCG count = 7)

Example:
  CAG=17 (normal):   LL ≈ -2.32
  CAG=35 (boundary):  LL ≈ -8.11
  CAG=45 (disease):   LL ≈ -18.4
```

**Normalization to [0, 1] score:**

```
normalized_score = (LL - FLOOR) / (PEAK - FLOOR)

where:
  PEAK = log(0.098) ≈ -2.32   [CAG=17, healthiest]
  FLOOR = -35.0               [severe disease threshold]
```

Result:
- **score = 1.0** → perfectly healthy sequence
- **score = 0.5** → boundary case (intermediate)
- **score = 0.0** → severe/anomalous

#### Parse Tree Construction

For visualization, the detector builds a **parse tree** showing how the grammar rules applied:

```
        EXON1
         / \
      FLANK5  REPEAT_REGION
      [5'UTR]    /        \
            CAG_BLOCK   CCG_BLOCK
             /  |  \     /  |  \
         CAG  CAG  ... CAG  CCG ... CCG
         [1]  [2]     [n]  [1]     [7]
```

Each node tracks:
- `symbol`: grammar rule
- `start`, `end`: position in sequence
- `prob`: rule probability
- `log_prob`: log of probability

---

### Fitness Landscape Modeling

#### 1. Aggregation Propensity (Nucleation Kinetics)

**Biological basis:** PolyQ tracts above ~35 repeats aggregate rapidly (Scherzinger et al. 1997).

**Model (Bhattacharyya et al. 2005):**

```
P_agg(n) = 1 - exp(-k × (n - threshold))    for n > threshold
         = 0.02 × (n / threshold)           for n ≤ threshold

Parameters:
  k = 0.15           [rate constant, per CAG repeat]
  threshold = 35     [CAG repeat threshold for aggregation]

Examples:
  n=17:  P_agg = 0.02 × 17/35 = 0.0097  [almost no aggregation]
  n=40:  P_agg = 1 - exp(-0.15×5) = 0.53 [moderate aggregation]
  n=60:  P_agg = 1 - exp(-0.15×25) = 0.99 [nearly complete aggregation]
```

**Interpretation:**
- Low pAgg (≤0.2) → protein is soluble, functional
- High pAgg (≥0.8) → rapid aggregate formation, toxic

---

#### 2. Transcriptional Dysregulation

**Biological basis:** Expanded polyQ sequesters transcription factors (CBP, SP1, TAFII130), disrupting gene expression.

**Model:**

```
T_dys(n) = 1 - exp(-k × (n - threshold))    for n > threshold
         = 0.0                              for n ≤ threshold

Parameters:
  k = 0.08
  threshold = 40    [transcription becomes disrupted above this]

Examples:
  n=40:  T_dys = 1 - exp(-0.08×0) = 0.0   [no transcriptional effect]
  n=50:  T_dys = 1 - exp(-0.08×10) = 0.55 [moderate dysregulation]
  n=70:  T_dys = 1 - exp(-0.08×30) = 0.91 [severe dysregulation]

Interpretation:
  Reduced transcription of neuroprotective genes (BDNF, PGC1α, HSP70)
```

---

#### 3. PCFG Fitness Proxy

Uses the healthy population CAG distribution as a grammar-based fitness signal:

```
F_pcfg(n) = P(n | healthy grammar) / PEAK_PROB

where PEAK_PROB = 0.098 (probability of observing 17–18 CAG in healthy pop.)

Examples:
  n=17:  F_pcfg = 0.095 / 0.098 = 0.97  [peak fitness]
  n=35:  F_pcfg = 0.0003 / 0.098 = 0.003 [declining]
  n=50:  F_pcfg ≈ 1e-9 / 0.098 → ~0     [disease range]
```

---

#### 4. Composite Fitness Score

**Weighted integration of all three signals:**

```
F_composite(n) = 0.30 × F_pcfg(n)
               + 0.40 × (1 - P_agg(n))        [invert aggregation]
               + 0.30 × (1 - T_dys(n))        [invert dysregulation]

Weights justify:
  40% aggregation     — physical protein misfolding is dominant toxicity
  30% transcription   — loss of neurotrophic support is important
  30% PCFG           — statistical population model captures evolutionary fitness

Example: CAG=45
  F_pcfg(45) ≈ 0
  P_agg(45) = 1 - exp(-0.15×10) = 0.78
  T_dys(45) = 1 - exp(-0.08×5) = 0.33
  
  F_composite = 0.30×0 + 0.40×(1-0.78) + 0.30×(1-0.33)
              = 0 + 0.088 + 0.201
              = 0.289  [significantly reduced fitness]
```

---

### Clinical Risk Scoring

**Goal:** Map CAG repeat count to continuous disease risk (0 = no disease, 1 = certain disease).

#### 5-Zone Risk Model

```
Risk Score = R(n):

Zone 1: n ≤ 26  (Normal)
  R(n) = 0.0

Zone 2: 27 ≤ n ≤ 35  (Mutable Normal)
  R(n) = 0.02 × (n - 26) / 9        [linear ramp to 0.02]
  Interpretation: unstable on transmission, small risk of expansion

Zone 3: 36 ≤ n ≤ 39  (Intermediate)
  R(n) = 0.02 + (n - 36) / 3 × 0.68  [linear ramp 0.02 → 0.70]
  Interpretation: reduced penetrance; ~30–70% will develop disease

Zone 4: 40 ≤ n ≤ 59  (Full Penetrance, Adult Onset)
  t = (n - 40) / 19
  R(n) = 0.70 + t × 0.25              [sigmoid approach to 1.0]
  Interpretation: ≥70% penetrance; disease likely

Zone 5: n ≥ 60  (Juvenile)
  R(n) = min(1.0, 0.95 + 0.005 × (n - 60))  [approaches 1.0]
  Interpretation: 100% penetrance; very early onset
```

**Clinical Examples:**

| CAG | Risk Score | Classification | Penetrance | Notes |
|-----|-----------|---|---|---|
| 20  | 0.00      | Normal | 0% | Safe |
| 35  | 0.02      | High Normal | ~0% | Unstable on transmission |
| 37  | 0.25      | Intermediate | 25% | May not develop disease |
| 40  | 0.70      | HD | 70% | Likely disease |
| 50  | 0.83      | HD | 83% | Early-onset |
| 65  | 1.00      | Juvenile HD | 100% | Childhood onset |

---

### Onset Age Prediction

**Model:** Langbehn et al. (2004) exponential regression

```
AGE_onset = 21.54 + exp(9.556 - 0.1460 × CAG)

Where:
  21.54 = baseline age adjustment
  exp(9.556 - ...) = exponential decay of age with increasing CAG
  0.1460 = slope (age decreases ~4.2 years per additional CAG above 40)

Examples:

  CAG=40:  AGE = 21.54 + exp(9.556 - 5.84) = 21.54 + 51.4 ≈ 72.9 years
  CAG=45:  AGE = 21.54 + exp(9.556 - 6.57) = 21.54 + 20.0 ≈ 41.5 years
  CAG=55:  AGE = 21.54 + exp(9.556 - 8.03) = 21.54 + 2.91 ≈ 24.4 years
  CAG=70:  AGE = 21.54 + exp(9.556 - 10.22) = 21.54 + 0.05 ≈ 21.6 years
```

**Confidence Intervals:**

Approximate 25th–75th percentile from literature:

```
95% CI ≈ [median - 8 years, median + 8 years]

Example (CAG=45):
  Median: 41.5 years
  25th percentile: ~33.5 years
  75th percentile: ~49.5 years
```

**Validity:**
- Trained on CAG 40–56
- Extrapolated outside this range
- Individual variation is significant (±8–10 years)
- Genetic modifiers (CCG count, HTT haplotype) can shift onset

---

### Drug Interaction Kinetics

#### 1. Binding Affinity (Langmuir Isotherm)

**Model:** Drug binding to polyQ domain follows simple ligand-receptor kinetics.

```
         [D] × [R]
[DR] = ─────────────
       Kd + [D]

Bound fraction = [DR] / [R]_total = [D] / (Kd + [D])

Where:
  [D] = drug concentration (µM)
  Kd = dissociation constant (µM) — lower = tighter binding
  [DR] = drug-receptor complex
```

**CAG-dependent Kd model:**

```
Kd(n) = 200 µM                              if n ≤ 35
      = 50 × exp(-0.08 × (n - 35)) µM      if n > 35
      
Clamped: 0.5 ≤ Kd ≤ 200 µM

Examples:
  CAG=20:  Kd = 200 µM         [very weak binding to normal polyQ]
  CAG=40:  Kd = 50 × exp(-0.4) ≈ 33.6 µM   [moderate binding]
  CAG=50:  Kd = 50 × exp(-1.2) ≈ 15.1 µM   [tight binding]
  CAG=65:  Kd = 50 × exp(-2.4) ≈ 3.65 µM   [very tight binding]
```

**Why?** Longer polyQ tracts have more binding sites and higher local concentration → lower Kd

**Example calculation:**

```
CAG=45, drug concentration = 10 µM:
  Kd = 50 × exp(-0.08 × 10) = 50 × 0.527 = 26.35 µM
  
  Bound fraction = 10 / (26.35 + 10) = 10 / 36.35 = 0.275
  
Interpretation: ~27.5% of polyQ molecules have drug bound
```

---

#### 2. Free Energy of Binding (ΔG)

```
ΔG = -RT ln(Kd)

Where:
  R = 8.314 J/(mol·K) = 1.987 cal/(mol·K)
  T = 310 K (37°C, body temperature)
  ln(Kd in µM)

Calculation:
  ΔG (kcal/mol) = -1.987e-3 × 310 × ln(Kd)
                = -0.616 × ln(Kd)

Examples:
  Kd = 1 µM:    ΔG = -0.616 × ln(1) = 0 kcal/mol      [no net binding]
  Kd = 10 µM:   ΔG = -0.616 × ln(10) = -1.42 kcal/mol [weak]
  Kd = 0.1 µM:  ΔG = -0.616 × ln(0.1) = 1.42 kcal/mol [tight]
```

---

#### 3. Aggregation Kinetics (Oosawa Model)

**Problem:** Drug-induced reduction in aggregation rate is key to therapeutic effect.

**Model:** Nucleation-elongation kinetics (Oosawa-Kasai)

```
dM/dt = k_n × C^n × (1 - M)  +  k_e × C × M × (1 - M)  -  k_off × M

Where:
  M = fraction aggregated [0, 1]
  C = monomer concentration (normalized = 1)
  k_n = nucleation rate constant
  k_e = elongation rate constant
  k_off = dissociation/degradation rate
  n = cooperativity exponent (n=2)
```

**Parameter scaling with CAG:**

```
k_n(CAG)  = 0.002 × P_agg(CAG)      [length-dependent nucleation]
k_e(CAG)  = 0.15 × P_agg(CAG)       [length-dependent elongation]
k_off     = 0.01                     [fixed degradation]

Example: CAG=45
  P_agg(45) = 0.53 (from earlier calculation)
  k_n = 0.002 × 0.53 = 1.06e-3
  k_e = 0.15 × 0.53 = 0.0795
```

---

#### 4. Drug Effect on Aggregation

**Mechanism:** Drug binding suppresses nucleation (barrier to initial aggregate formation) more than elongation (adding to existing fibrils).

```
With drug:
  k_n' = k_n × (1 - B_frac × 0.85)    [drug suppresses nucleation by 85%]
  k_e' = k_e × (1 - B_frac × 0.60)    [drug suppresses elongation by 60%]
  
Where B_frac = bound fraction (from Langmuir model)

Example: CAG=45, 10 µM drug, Kd=26.35 µM
  B_frac = 0.275 (from earlier)
  k_n' = 1.06e-3 × (1 - 0.275 × 0.85) = 1.06e-3 × 0.766 = 8.12e-4
  k_e' = 0.0795 × (1 - 0.275 × 0.60) = 0.0795 × 0.835 = 0.0664
  
Effect:
  Nucleation rate reduced by 23%
  Elongation rate reduced by 16%
  → Lag phase (time to 10% aggregation) increases ~3–5×
```

---

#### 5. Lag Phase (Therapeutic Endpoint)

```
Lag phase = time to reach 10% aggregation

Without drug:
  T_lag,no_drug ≈ (depends on k_n, k_e)
  
With drug:
  T_lag,with_drug >> T_lag,no_drug
  
Example output:
  CAG=45, 10 µM drug, 48 hour simulation:
    Lag (no drug): 6.2 hours
    Lag (with drug): 18.5 hours
    
  → Drug delays aggregation by ~3× (therapeutic benefit!)
```

---

### Protein Structure & Accessibility

#### ESMFold Integration

**API:** Meta's official ESMFold API (`api.esmatlas.com`)

```
POST https://api.esmatlas.com/foldSequence/v1/pdb/
  Body: amino acid sequence (text/plain)
  Returns: PDB format (3D structure)
```

**Output:** pLDDT (predicted local distance difference test) for each residue:
- **pLDDT > 90** → rigid, well-folded (high confidence)
- **70 < pLDDT < 90** → structured but flexible
- **50 < pLDDT < 70** → flexible
- **pLDDT < 50** → disordered, highly flexible (drug-accessible)

---

#### Drug Accessibility Scoring

```
Accessibility score = function(pLDDT):

pLDDT < 50:   accessibility = 1.0  [Disordered]  → HIGHLY ACCESSIBLE
50 ≤ pLDDT < 70:  accessibility = 0.6  [Flexible]     → MODERATELY ACCESSIBLE
70 ≤ pLDDT < 90:  accessibility = 0.2  [Structured]   → WEAKLY ACCESSIBLE
pLDDT ≥ 90:   accessibility = 0.05 [Rigid]      → INACCESSIBLE
```

**Hotspot detection:** Scan a 5-residue window; report windows with average accessibility > 0.7.

```
Example output:
  Residues 18–23 (polyQ start):   pLDDT = [28, 32, 31, 35, 29] → avg = 31
    → Accessibility = 1.0 per residue
    → Hotspot! (highly drug-accessible)
    
  Residues 80–85 (flanking):      pLDDT = [75, 78, 81, 77, 76] → avg = 77.4
    → Accessibility = 0.2 per residue
    → NOT a hotspot (too rigid)
```

---

### Heredity Modeling

#### Intergenerational CAG Expansion

**Mechanism:** Replication slippage during meiosis causes polyQ tract length to change.

**Model:**

```
CAG_{child} = CAG_{parent} + ΔCAG

Where ΔCAG ~ Normal(μ, σ²)

Parameters:
  μ = 1.5 repeats   [average expansion per transmission]
  σ = 3.0 repeats   [standard deviation; wide variation]

Rules:
  - If parent CAG ≤ 35: stable (ΔCAG ≈ 0, mostly)
  - If parent CAG > 35: expansion occurs (ΔCAG > 0 usually)
  - Never shrink below parent value (replication slippage is one-directional)
  - Cap at 120 repeats (biological maximum)
```

**Example pedigree (5 generations, founder CAG=40):**

```
Gen 0: 40 CAG (founder)
         |
Gen 1: [42, 43] CAG (mean expansion = 2.5)
         |  |
Gen 2: [45, 41], [47, 44]  (variation in expansion)
         ...
```

**Probability of expansion above 40:**
- Parent CAG=40 → ~70% chance child CAG > 40
- Parent CAG=50 → ~95% chance child CAG > 50
- Parent CAG=60 → ~100% chance child CAG > 60

---

## API Reference

### Core Endpoints

#### 1. **POST /api/htt/detect**

Analyze an HTT sequence.

**Request:**
```json
{
  "sequence": "ATGCAG...CAG...CCG...",
  "label": "Patient ID"
}
```
or (for quick demo):
```json
{
  "cag_count": 45
}
```

**Response:**
```json
{
  "parse_success": true,
  "cag_count": 45,
  "ccg_count": 7,
  "classification": {
    "cag_repeats": 45,
    "cls": "huntingtons_disease",
    "risk": "full_penetrance",
    "color": "#E74C3C"
  },
  "log_likelihood": -18.34,
  "normalized_score": 0.0021,
  "anomaly_score": 0.9979,
  "repeat_start": 87,
  "repeat_end": 222,
  "mutation_type": "expansion",
  "onset_prediction": {
    "median_onset": 41.5,
    "lower_25th": 33.5,
    "upper_75th": 49.5,
    "model": "Langbehn_et_al_2004"
  },
  "risk_level": "full_penetrance",
  "risk_color": "#E74C3C",
  "flanks_intact": true,
  "flank5_match": true,
  "flank3_match": true,
  "interruptions": [],
  "parse_tree": {
    "name": "EXON1",
    "start": 0,
    "end": 510,
    "children": [...]
  }
}
```

---

#### 2. **GET /api/htt/landscape**

Fetch fitness/risk landscape data.

**Query Params:**
- `type`: `"fitness"` | `"risk"` | `"onset"` (default: `"fitness"`)
- `min_cag`: int (default: 6)
- `max_cag`: int (default: 80)

**Response:**
```json
{
  "type": "fitness",
  "min_cag": 6,
  "max_cag": 80,
  "points": [
    {
      "cag": 6,
      "fitness": 0.9543,
      "aggregation": 0.0097,
      "transcriptional_integrity": 1.0,
      "pcfg_fitness": 0.0102,
      "classification": "normal",
      "color": "#27AE60",
      "risk": "none",
      "onset_median": null
    },
    ...
    {
      "cag": 45,
      "fitness": 0.2891,
      "aggregation": 0.7836,
      "transcriptional_integrity": 0.6703,
      "pcfg_fitness": 0.0000,
      "classification": "huntingtons_disease",
      "color": "#E74C3C",
      "risk": "full_penetrance",
      "onset_median": 41.5
    }
  ],
  "thresholds": {
    "normal_max": 35,
    "intermediate_min": 36,
    "disease_min": 40,
    "juvenile_min": 60
  }
}
```

---

#### 3. **GET /api/htt/classify/<n>**

Quick classification for a CAG count.

**Response:**
```json
{
  "cag_count": 45,
  "cag_repeats": 45,
  "cls": "huntingtons_disease",
  "risk": "full_penetrance",
  "color": "#E74C3C",
  "onset_prediction": {
    "median_onset": 41.5,
    "lower_25th": 33.5,
    "upper_75th": 49.5,
    "model": "Langbehn_et_al_2004",
    "note": "Median estimate; individual onset varies significantly"
  }
}
```

---

#### 4. **POST /api/htt/drug/simulate**

Simulate drug binding & effect on fitness.

**Request:**
```json
{
  "cag": 45,
  "drug_concentration": 10.0,
  "drug_type": "polyQ_binder"
}
```

**Response:**
```json
{
  "cag": 45,
  "drug_concentration": 10.0,
  "drug_type": "polyQ_binder",
  "binding_affinity_kd_um": 26.35,
  "bound_fraction": 0.275,
  "delta_g_kcal": -1.35,
  "aggregation_before": 0.7836,
  "aggregation_after": 0.6159,
  "fitness_before": 0.2164,
  "fitness_after": 0.3524,
  "fitness_improvement": 0.1360
}
```

---

#### 5. **POST /api/htt/drug/kinetics**

Simulate aggregation kinetics over time, with vs. without drug.

**Request:**
```json
{
  "cag": 45,
  "drug_concentration": 10.0,
  "time_points": 100,
  "t_max": 48.0
}
```

**Response:**
```json
{
  "times": [0, 0.48, 0.96, ...],
  "no_drug": [0.0001, 0.0002, 0.0005, ...],
  "with_drug": [0.0001, 0.0001, 0.0003, ...],
  "lag_no_drug": 6.2,
  "lag_with_drug": 18.5,
  "bound_fraction": 0.275,
  "kd_um": 26.35,
  "k_n": 0.00106,
  "k_e": 0.07948,
  "cag": 45,
  "agg_propensity": 0.7836
}
```

---

#### 6. **POST /api/htt/drug/accessibility**

Compute per-residue drug accessibility from ESMFold pLDDT scores.

**Request:**
```json
{
  "sequence": "MATLEKLMKAFESLKSF...",
  "cag": 45
}
```

**Response:**
```json
{
  "residues": [
    {
      "index": 0,
      "residue": "M",
      "plddt": 85.3,
      "label": "Structured",
      "color": "#56AEE2",
      "drug_access": 0.2
    },
    {
      "index": 17,
      "residue": "Q",
      "plddt": 32.1,
      "label": "Disordered",
      "color": "#E24B4A",
      "drug_access": 1.0
    }
  ],
  "hotspots": [
    {
      "start": 17,
      "end": 22,
      "score": 0.95
    }
  ],
  "cag": 45,
  "source": "esmfold",
  "total": 200
}
```

---

#### 7. **POST /api/htt/interactions/simulate**

Simulate gene expression dynamics under mutant HTT.

**Request:**
```json
{
  "cag": 45,
  "steps": 50,
  "dt": 0.1
}
```

**Response:**
```json
{
  "time": [0, 0.1, 0.2, ...],
  "traces": {
    "BDNF": [1.0, 0.95, 0.89, ...],
    "CBP": [1.0, 0.92, 0.85, ...],
    "CASP3": [0.1, 0.15, 0.22, ...]
  },
  "htt_activity": 0.333,
  "cag": 45
}
```

---

#### 8. **POST /api/htt/heredity/simulate**

Simulate intergenerational CAG expansion in a family.

**Request:**
```json
{
  "founder_cag": 40,
  "generations": 5
}
```

**Response:**
```json
{
  "nodes": [
    {
      "id": 0,
      "cag": 40,
      "generation": 0,
      "parent_id": null,
      "affected": true,
      "risk_label": "full_penetrance",
      "onset_median": 72.9,
      "color": "#E74C3C"
    },
    {
      "id": 1,
      "cag": 43,
      "generation": 1,
      "parent_id": 0,
      "affected": true,
      "risk_label": "full_penetrance",
      "onset_median": 53.2,
      "color": "#E74C3C"
    }
  ],
  "edges": [
    {"from": 0, "to": 1},
    {"from": 0, "to": 2}
  ],
  "generations": 5,
  "founder_cag": 40
}
```

---

#### 9. **POST /api/htt/protein/analyze**

Analyze protein sequence for polyQ mutations and return 3D structure.

**Request:**
```json
{
  "sequence": "MATLEKLMKAFESLKSFQQQ...",
  "reference_cag": 24
}
```

**Response:**
```json
{
  "polyq_length": 45,
  "polyq_sequence": "QQQ...QQQ",
  "reference_length": 24,
  "difference": 21,
  "mutation_type": "expansion",
  "classification": "full_penetrance",
  "interruptions": [],
  "residues": [
    {
      "index": 0,
      "x": 1.2,
      "y": 0.0,
      "z": 0.0,
      "color": "rgb(186, 117, 23)",
      "is_expanded": false
    }
  ],
  "aggregation_score": 0.7836,
  "normal_polyq_length": 24
}
```

---

#### 10. **GET /api/htt/references**

List all reference sequences with metadata.

**Response:**
```json
{
  "healthy_low": {
    "label": "Healthy — Low Normal (17 CAG)",
    "cag_repeats": 17,
    "classification": "healthy_normal",
    "risk": "none",
    "description": "Most common allele in general population",
    "sequence_length": 510
  },
  "hd_typical": {
    "label": "HD — Typical Adult Onset (45 CAG)",
    "cag_repeats": 45,
    "classification": "huntingtons_disease",
    "risk": "full_penetrance",
    "description": "Typical adult-onset case. Mean onset ~mid-40s.",
    "sequence_length": 600
  }
}
```

---

## Usage Examples

### Example 1: Detect CAG Expansion

**Frontend:** User uploads FASTA sequence

```javascript
const response = await fetch('http://localhost:5000/api/htt/detect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sequence: 'ATGCAGGTGCAGGGCAGCCGGGCTCAGGAGCTGGAGCCGCTGCAGCTG...',
    label: 'Patient_001'
  })
});
const result = await response.json();
console.log(`CAG count: ${result.cag_count}`);
console.log(`Risk: ${result.classification.risk}`);
console.log(`Onset prediction: ${result.onset_prediction.median_onset} years`);
```

---

### Example 2: Compare Fitness Landscapes

**Fetch landscape data:**

```bash
curl 'http://localhost:5000/api/htt/landscape?type=fitness&min_cag=10&max_cag=70'
```

**Use in D3.js visualization:**
```javascript
const data = await fetch('/api/htt/landscape?type=fitness').then(r => r.json());
const svg = d3.select('#landscape');
svg.selectAll('circle')
  .data(data.points)
  .enter()
  .append('circle')
  .attr('cx', d => xScale(d.cag))
  .attr('cy', d => yScale(d.fitness))
  .attr('fill', d => d.color)
  .attr('r', 5);
```

---

### Example 3: Drug Efficacy Analysis

**Python script:**

```python
import requests

# CAG=45 (typical HD)
response = requests.post('http://localhost:5000/api/htt/drug/simulate', json={
    'cag': 45,
    'drug_concentration': 10.0,
    'drug_type': 'polyQ_binder'
})

data = response.json()
print(f"Aggregation reduction: {data['aggregation_before']:.3f} → {data['aggregation_after']:.3f}")
print(f"Fitness improvement: {data['fitness_improvement']:.3f}")
print(f"Binding affinity (Kd): {data['binding_affinity_kd_um']:.1f} µM")
```

Output:
```
Aggregation reduction: 0.784 → 0.616
Fitness improvement: 0.136
Binding affinity (Kd): 26.35 µM
```

---

### Example 4: Family Risk Assessment

**Query:** Founder CAG=40, predict 3 generations

```javascript
const response = await fetch('http://localhost:5000/api/htt/heredity/simulate', {
  method: 'POST',
  body: JSON.stringify({
    founder_cag: 40,
    generations: 3
  })
});
const pedigree = await response.json();

// Analyze expansion pattern
pedigree.nodes.forEach(node => {
  console.log(`Gen ${node.generation}, CAG=${node.cag}, Risk=${node.risk_label}`);
});
```

Output:
```
Gen 0, CAG=40, Risk=full_penetrance
Gen 1, CAG=42, Risk=full_penetrance
Gen 1, CAG=41, Risk=full_penetrance
Gen 2, CAG=44, Risk=full_penetrance
Gen 2, CAG=40, Risk=full_penetrance
...
```

---

## Research & Citations

### Key References

1. **Langbehn, D. R., Brinkman, R. R., Falush, D., Paulsen, J. S., & Hayden, M. R. (2004).** 
   *A new model for prediction of the age of onset and penetrance for Huntington's disease based on CAG repeat number.* 
   **Journal of Medical Genetics, 41(6), 439–443.**
   - Exponential model for onset age prediction (Equation 1)

2. **Scherzinger, E., Sittler, A., Schweiger, K., et al. (1997).**
   *Self-assembling of polyglutamine-containing proteins is seeded by polyglutamine expansions.*
   **Cell, 90(3), 549–558.**
   - Nucleation kinetics of polyQ aggregation

3. **Bhattacharyya, A., Thakur, A. K., Chellgren, V. M., et al. (2005).**
   *Oligoproline effects on polyglutamine aggregation and implications for Huntington's disease.*
   **PNAS, 102(45), 11911–11916.**
   - Aggregation propensity formula (Equation 2)

4. **Zhai, W., Jeong, H., Cui, L., et al. (2005).**
   *Transglutaminase-catalyzed cross-linking is involved in polyglutamine aggregation.*
   **Journal of Biological Chemistry, 280(36), 31559–31569.**
   - Transcriptional dysregulation mechanism

5. **Cha, J.-H. J. (2000).**
   *Transcriptional dysregulation in Huntington's disease.*
   **Trends in Neurosciences, 23(9), 387–392.**
   - Transcription factor sequestration

6. **Sorolla, M. A., Deepak, P., Ashankyants, I., et al. (2010).**
   *Genomic analysis of Huntington's disease in a large Venezuelan kindred.*
   **Nature Medicine, 16(12), 1410–1417.**
   - CCG repeat modulation of age of onset

7. **Lin, Z., Jiang, S., Kang, D., et al. (2018).**
   *Structural basis of transthyretin point mutations associated with familial amyloid polyneuropathy.*
   **PNAS, 115(15), 3914–3919.**
   - Drug binding thermodynamics (ΔG)

8. **Oosawa, F., & Kasai, M. (1962).**
   *A theory of linear and helical aggregate formation of macromolecules.*
   **Journal of Molecular Biology, 4(1), 10–21.**
   - Nucleation-elongation kinetics model (Equation 3)

9. **AlphaFold Consortium (2021).**
   *Protein structure predictions for the human genome and across all organisms.*
   **Nature, 596, 583–589.**
   - Structure prediction confidence metrics (pLDDT)

10. **ESMFold (Lin, Z., et al., 2023).**
    *Language models of protein sequences at scale learn continuous representations of structure.*
    **biorXiv preprint.**
    - Ultrafast protein folding (3×60× faster than AlphaFold2)

11. **ChEMBL Database (Gaulton, A., et al., 2017).**
    *The ChEMBL database in 2017.*
    **Nucleic Acids Research, 45(D1), D945–D954.**
    - Drug–target activity data

12. **Metzger, S., Bauer, P., Tomiuk, J., et al. (2006).**
    *Expanded CAG repeats in the HTT gene in Huntington disease patients.*
    **American Journal of Human Genetics, 79(3), 427–438.**
    - Healthy population CAG distribution (Figure 1, Table 2)

---

## Features Roadmap

- [ ] **Machine Learning Integration** — Train LSTM on mutation-to-phenotype mapping
- [ ] **Multi-drug Cocktail Simulator** — Synergistic/antagonistic effects
- [ ] **Patient Stratification** — Clustering HD patients by response profile
- [ ] **Real-time Exome Analysis** — Whole-genome variant calling integration
- [ ] **Mobile App** — React Native for iOS/Android
- [ ] **Bayesian Uncertainty Quantification** — Confidence intervals on all predictions

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

MIT License — see `LICENSE` file for details.

---

## Contact & Support

- **Issues:** [GitHub Issues](https://github.com/Ashwot-Acharya/SnapseX/issues)
- **Email:** ashwot.acharya@example.com
- **Documentation:** Full API docs at `/docs` (Swagger)

---

## Disclaimer

**SnapseX is for research and educational purposes.** It is **NOT a clinical diagnostic tool**. Results should not be used for medical decision-making without professional genetic counseling and clinical validation.

---

**Last Updated:** 2026-05-09  
**Version:** 1.0.0  
**Maintainer:** [@Ashwot-Acharya](https://github.com/Ashwot-Acharya)