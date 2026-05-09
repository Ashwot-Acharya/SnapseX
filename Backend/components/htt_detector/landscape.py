"""
HTT Fitness & Risk Landscape
==============================
Computes the fitness and clinical risk landscape across CAG repeat counts.

Fitness here means "cellular fitness" — how well the huntingtin protein
functions as CAG repeat length increases. This is based on:

  1. Protein aggregation propensity (PolyQ length → aggregation rate)
     Source: Scherzinger et al. (1997), Bhattacharyya et al. (2005)
     Aggregation rate ∝ exp(k * (n - threshold)) for n > threshold

  2. Transcriptional dysregulation score
     HTT with expanded polyQ increasingly sequesters transcription factors
     Effect size scales with repeat length above 35

  3. PCFG log-likelihood from the CFG detector
     Gives a grammar-based fitness proxy

  4. Clinical risk (categorical → continuous mapping)

Landscape types:
  - fitness:  cellular/protein fitness (1=healthy, 0=dysfunctional)
  - risk:     clinical disease risk (0=none, 1=certain disease)
  - onset:    predicted age of onset (None if below threshold)
"""

import math
from sequences import classify_repeat, predict_onset_age
# -----------------------------------------------------------------------
# AGGREGATION MODEL
# Scherzinger et al. (1997): polyQ aggregation follows nucleation kinetics
# Half-time of aggregation (t½) ∝ exp(-b * n) for n > threshold
# We invert this: aggregation propensity P_agg ∝ 1 - exp(-k*(n-35)) for n>35
# -----------------------------------------------------------------------

def aggregation_propensity(n_cag: int) -> float:
    """
    Normalized aggregation propensity (0 = no aggregation, 1 = maximal).
    Below 35 repeats: near zero.
    Above 35: rapid increase (nucleation kinetics).
    """
    THRESHOLD = 35
    K = 0.15    # rate constant from Bhattacharyya 2005

    if n_cag <= THRESHOLD:
        # Small baseline — healthy polyQ still has tiny aggregation tendency
        return 0.02 * (n_cag / THRESHOLD)
    else:
        excess = n_cag - THRESHOLD
        # Saturates at 1 for large n
        return min(1.0, 1.0 - math.exp(-K * excess))


# -----------------------------------------------------------------------
# TRANSCRIPTIONAL DYSREGULATION MODEL
# Zhai et al., Cha et al.: expanded polyQ sequesters CBP, SP1, TAFII130
# Effect scales with repeat length above ~40
# -----------------------------------------------------------------------

def transcriptional_dysregulation(n_cag: int) -> float:
    """
    Transcriptional dysregulation score (0 = normal, 1 = maximal disruption).
    """
    THRESHOLD = 40
    K = 0.08

    if n_cag < THRESHOLD:
        return 0.0
    return min(1.0, 1.0 - math.exp(-K * (n_cag - THRESHOLD)))


# -----------------------------------------------------------------------
# PCFG FITNESS PROXY
# Uses the healthy population log-likelihood as a grammar fitness signal
# -----------------------------------------------------------------------

def pcfg_fitness(n_cag: int) -> float:
    """
    PCFG-based fitness score from the healthy population distribution.
    Peak fitness at n=17, declines toward disease range.
    """
    HEALTHY_CAG_DIST = {
        6: 0.001, 7: 0.003, 8: 0.005, 9: 0.008, 10: 0.015,
        11: 0.020, 12: 0.028, 13: 0.038, 14: 0.055, 15: 0.068,
        16: 0.082, 17: 0.095, 18: 0.098, 19: 0.092, 20: 0.085,
        21: 0.072, 22: 0.058, 23: 0.045, 24: 0.034, 25: 0.024,
        26: 0.017, 27: 0.010, 28: 0.007, 29: 0.004, 30: 0.003,
        31: 0.002, 32: 0.001, 33: 0.0008, 34: 0.0005, 35: 0.0003,
    }
    PEAK = 0.098   # at n=18

    if n_cag in HEALTHY_CAG_DIST:
        return HEALTHY_CAG_DIST[n_cag] / PEAK
    elif n_cag < 6:
        return 0.01
    else:
        # Rapid decline in disease range
        return max(0.0, 0.003 * math.exp(-0.2 * (n_cag - 35)) / PEAK)


# -----------------------------------------------------------------------
# COMPOSITE FITNESS SCORE
# Combines aggregation, transcriptional, and PCFG signals
# -----------------------------------------------------------------------

def composite_fitness(n_cag: int) -> float:
    """
    Overall cellular fitness score (1 = fully healthy, 0 = dysfunctional).
    
    Weighted combination:
      - PCFG grammar fitness:           30%
      - Protein aggregation resistance: 40%
      - Transcriptional integrity:      30%
    """
    w_pcfg  = 0.30
    w_agg   = 0.40
    w_trans = 0.30

    pcfg    = pcfg_fitness(n_cag)
    no_agg  = 1.0 - aggregation_propensity(n_cag)    # invert: high agg = low fitness
    no_dys  = 1.0 - transcriptional_dysregulation(n_cag)

    return round(w_pcfg * pcfg + w_agg * no_agg + w_trans * no_dys, 4)


# -----------------------------------------------------------------------
# RISK SCORE (clinical)
# Continuous mapping of clinical risk (0=none, 1=certain)
# -----------------------------------------------------------------------

def clinical_risk_score(n_cag: int) -> float:
    """
    Continuous clinical risk score (0 = no risk, 1 = certain HD).
    
    Uses:
      - Below 27: effectively zero risk
      - 27–35: mutable allele, small transmission risk
      - 36–39: reduced penetrance (0.3–0.7)
      - 40+: full penetrance (approaches 1.0)
      - 60+: juvenile, risk = 1.0
    """
    if n_cag <= 26:
        return 0.0
    elif n_cag <= 35:
        return 0.02 * (n_cag - 26) / 9      # 0 → 0.02
    elif n_cag <= 39:
        # Reduced penetrance: linear ramp 0.02 → 0.7
        t = (n_cag - 36) / 3
        return 0.02 + t * 0.68
    elif n_cag <= 59:
        # Full penetrance: sigmoid approach to 1.0
        t = (n_cag - 40) / 19
        return 0.7 + t * 0.25
    else:
        return min(1.0, 0.95 + 0.005 * (n_cag - 60))


# -----------------------------------------------------------------------
# LANDSCAPE BUILDERS
# -----------------------------------------------------------------------

def build_fitness_landscape(min_cag: int = 6, max_cag: int = 80) -> list[dict]:
    """Build fitness landscape data points for d3.js visualization."""
    points = []
    for n in range(min_cag, max_cag + 1):
        cls = classify_repeat(n)
        onset = predict_onset_age(n)
        points.append({
            "cag": n,
            "fitness": composite_fitness(n),
            "aggregation": round(aggregation_propensity(n), 4),
            "transcriptional_integrity": round(1.0 - transcriptional_dysregulation(n), 4),
            "pcfg_fitness": round(pcfg_fitness(n), 4),
            "classification": cls["cls"],
            "color": cls["color"],
            "risk": cls["risk"],
            "onset_median": onset.get("median_onset"),
        })
    return points


def build_risk_landscape(min_cag: int = 6, max_cag: int = 80) -> list[dict]:
    """Build clinical risk landscape data points."""
    points = []
    for n in range(min_cag, max_cag + 1):
        cls = classify_repeat(n)
        onset = predict_onset_age(n)
        points.append({
            "cag": n,
            "risk_score": round(clinical_risk_score(n), 4),
            "classification": cls["cls"],
            "color": cls["color"],
            "risk_label": cls["risk"],
            "onset_median": onset.get("median_onset"),
            "onset_lower": onset.get("lower_25th"),
            "onset_upper": onset.get("upper_75th"),
        })
    return points


# -----------------------------------------------------------------------
# QUICK TEST
# -----------------------------------------------------------------------

if __name__ == "__main__":
    print("CAG | Fitness | Risk  | Agg   | Class")
    print("-" * 60)
    for n in [10, 17, 27, 35, 36, 39, 40, 45, 55, 60, 75]:
        cls = classify_repeat(n)
        print(
            f"{n:3d} | {composite_fitness(n):.3f}   | "
            f"{clinical_risk_score(n):.3f} | "
            f"{aggregation_propensity(n):.3f} | "
            f"{cls['cls']}"
        )