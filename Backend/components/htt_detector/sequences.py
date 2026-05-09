

HTT_EXON1_5PRIME_FLANK = (
    "ATGCAGGTGCAGGGCAGCCGGGCTCAGGAGCTGGAGCCGCTGCAGCTG"
    "GCGGAGCAGCAGCAACAGCAGCAGCAGCAGCAGCAGCAG"
)

HTT_5PRIME_INVARIANT = (
    "ATGCAGGTGCAGGGCAGCCGGGCTCAGGAGCTGGAGCCGCTGCAGCTG"
    "GCGGAGCA"
)

# 3' flank: immediately after CAG repeat
# Contains CAACAGCCGCCA then CCG repeat then rest of Exon 1
HTT_3PRIME_CAG_FLANK = "CAACAGCCGCCACCGCCGCCGCCGCCGCCGCCGCCTCCTCAGCTTCCTCAGCCGCCGCC"

# CCG repeat region (follows CAG repeat, encodes polyproline)
# Healthy: ~7–12 CCG repeats, almost always 7
HTT_CCG_REGION_TYPICAL = "CCGCCGCCGCCGCCGCCGCCG"  # 7 repeats

# After polyproline: remainder of Exon 1 into Exon 2 junction
HTT_EXON1_REMAINDER = (
    "GCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAG"  # placeholder
)

# -----------------------------------------------------------------------
# CANONICAL HEALTHY SEQUENCES (various CAG repeat counts)
# Format: construct_htt_exon1(n_cag) builds the full Exon 1 region
# -----------------------------------------------------------------------

def construct_htt_exon1(n_cag: int, n_ccg: int = 7) -> str:
    """
    Construct the HTT Exon 1 coding sequence with specified CAG repeat count.
    
    Parameters
    ----------
    n_cag : int
        Number of CAG repeats (healthy: 6–35)
    n_ccg : int
        Number of CCG repeats (almost always 7 in healthy individuals)
    
    Returns
    -------
    str : Exon 1 sequence (DNA, 5'→3')
    """
    cag_repeat = "CAG" * n_cag
    ccg_repeat = "CCG" * n_ccg
    return HTT_5PRIME_INVARIANT + cag_repeat + HTT_3PRIME_CAG_FLANK[:6] + ccg_repeat

def get_healthy_sequences() -> dict:
    """
    Return a dict of authoritative healthy HTT sequences
    covering the full normal CAG repeat range (6–35).
    
    Keys: "HTT_CAG_{n}" for n in range(6, 36)
    Values: dict with sequence, repeat_count, classification, risk
    """
    sequences = {}
    for n in range(6, 36):
        seq = construct_htt_exon1(n)
        sequences[f"HTT_CAG_{n}"] = {
            "accession": f"NM_002111.8_exon1_CAG{n}",
            "sequence": seq,
            "cag_repeats": n,
            "ccg_repeats": 7,
            "classification": "healthy_normal",
            "risk": "none",
            "length": len(seq),
            "source": "constructed_from_NM_002111.8"
        }
    return sequences


# -----------------------------------------------------------------------
# REFERENCE SEQUENCES FOR KEY CLINICAL CATEGORIES
# -----------------------------------------------------------------------

REFERENCE_SEQUENCES = {
    # --- HEALTHY ---
    "healthy_low": {
        "label": "Healthy — Low Normal (17 CAG)",
        "sequence": construct_htt_exon1(17),
        "cag_repeats": 17,
        "classification": "healthy_normal",
        "risk": "none",
        "description": "Most common allele in general population"
    },
    "healthy_high": {
        "label": "Healthy — High Normal (35 CAG)",
        "sequence": construct_htt_exon1(35),
        "cag_repeats": 35,
        "classification": "healthy_normal",
        "risk": "none",
        "description": "Upper boundary of normal range"
    },

    # --- MUTABLE NORMAL (intermediate) ---
    "intermediate_36": {
        "label": "Intermediate — Reduced Penetrance (36 CAG)",
        "sequence": construct_htt_exon1(36),
        "cag_repeats": 36,
        "classification": "intermediate",
        "risk": "reduced_penetrance",
        "description": "May or may not develop HD; unstable on transmission"
    },
    "intermediate_39": {
        "label": "Intermediate — Reduced Penetrance (39 CAG)",
        "sequence": construct_htt_exon1(39),
        "cag_repeats": 39,
        "classification": "intermediate",
        "risk": "reduced_penetrance",
        "description": "Upper boundary of reduced penetrance zone"
    },

    # --- FULL PENETRANCE ---
    "hd_40": {
        "label": "HD — Full Penetrance (40 CAG)",
        "sequence": construct_htt_exon1(40),
        "cag_repeats": 40,
        "classification": "huntingtons_disease",
        "risk": "full_penetrance",
        "description": "Minimum for full penetrance HD. Onset typically 60s."
    },
    "hd_typical": {
        "label": "HD — Typical Adult Onset (45 CAG)",
        "sequence": construct_htt_exon1(45),
        "cag_repeats": 45,
        "classification": "huntingtons_disease",
        "risk": "full_penetrance",
        "description": "Typical adult-onset case. Mean onset ~mid-40s."
    },
    "hd_early": {
        "label": "HD — Early Onset (55 CAG)",
        "sequence": construct_htt_exon1(55),
        "cag_repeats": 55,
        "classification": "huntingtons_disease",
        "risk": "full_penetrance_early",
        "description": "Early adult onset, more aggressive progression."
    },
    "hd_juvenile": {
        "label": "HD — Juvenile Onset (≥60 CAG)",
        "sequence": construct_htt_exon1(60),
        "cag_repeats": 60,
        "classification": "juvenile_huntingtons",
        "risk": "juvenile_onset",
        "description": "Juvenile HD. Onset before 20. Rapid progression."
    },
    "hd_severe": {
        "label": "HD — Severe Juvenile (80 CAG)",
        "sequence": construct_htt_exon1(80),
        "cag_repeats": 80,
        "classification": "juvenile_huntingtons",
        "risk": "juvenile_onset_severe",
        "description": "Severe juvenile HD. Can present in infancy."
    },
}


# -----------------------------------------------------------------------
# MUTATION CATALOG
# Specific point mutations and structural variants beyond CAG expansion
# -----------------------------------------------------------------------

KNOWN_MUTATIONS = {
    # CAG expansion (the primary Huntington's mechanism)
    "CAG_expansion": {
        "type": "repeat_expansion",
        "codon": "CAG",
        "mechanism": "trinucleotide_repeat_expansion",
        "affected_region": "exon1_polyQ",
        "threshold_disease": 40,
        "threshold_intermediate": 36,
        "threshold_normal_max": 35,
        "clinvar_id": "RCV000019169",
        "omim": "143100",
        "inheritance": "autosomal_dominant"
    },

    # Somatic mosaicism — different repeat lengths in different tissues
    "somatic_mosaicism": {
        "type": "somatic_variant",
        "mechanism": "replication_slippage",
        "note": "Repeat length varies between tissues; striatum shows highest expansion"
    },

    # CCG repeat variation (affects disease severity modifier)
    "CCG_variant": {
        "type": "repeat_variation",
        "codon": "CCG",
        "mechanism": "polyproline_length_variation",
        "note": "CCG repeat count modifies age of onset as secondary modifier"
    },
}


# -----------------------------------------------------------------------
# REPEAT CLASSIFICATION TABLE
# Source: Genetics in Medicine, Semaka et al., ClinVar classifications
# -----------------------------------------------------------------------

REPEAT_CLASSIFICATION = {
    (1,  26):  {"cls": "normal",              "risk": "none",               "color": "#27AE60"},
    (27, 35):  {"cls": "normal_mutable",      "risk": "unstable_on_tx",     "color": "#F39C12"},
    (36, 39):  {"cls": "intermediate",        "risk": "reduced_penetrance", "color": "#E67E22"},
    (40, 59):  {"cls": "huntingtons_disease", "risk": "full_penetrance",    "color": "#E74C3C"},
    (60, 999): {"cls": "juvenile_huntingtons","risk": "juvenile_onset",     "color": "#8E44AD"},
}

def classify_repeat(n_cag: int) -> dict:
    """Return clinical classification for a given CAG repeat count."""
    for (lo, hi), info in REPEAT_CLASSIFICATION.items():
        if lo <= n_cag <= hi:
            return {"cag_repeats": n_cag, **info}
    return {"cag_repeats": n_cag, "cls": "unknown", "risk": "unknown", "color": "#95A5A6"}


# -----------------------------------------------------------------------
# ONSET AGE PREDICTOR
# Based on: Langbehn et al. (2004) regression model
# onset_median = 21.54 + exp(9.556 - 0.1460 * CAG)
# -----------------------------------------------------------------------

import math

def predict_onset_age(n_cag: int) -> dict:
    """
    Predict median age of HD onset using Langbehn et al. (2004) model.
    Valid for CAG repeats 40–56 (extrapolated outside this range).
    
    Returns dict with median, 25th/75th percentile estimates.
    """
    if n_cag < 40:
        return {"median": None, "note": "Below disease threshold — onset not predicted"}
    
    try:
        median = 21.54 + math.exp(9.556 - 0.1460 * n_cag)
        # Approximate IQR from literature (~±8 years around median for typical cases)
        lower = max(1, median - 8)
        upper = median + 8
        return {
            "median_onset": round(median, 1),
            "lower_25th": round(lower, 1),
            "upper_75th": round(upper, 1),
            "model": "Langbehn_et_al_2004",
            "note": "Median estimate; individual onset varies significantly"
        }
    except OverflowError:
        return {"median_onset": "< 5 years", "note": "Extreme expansion — very early onset"}