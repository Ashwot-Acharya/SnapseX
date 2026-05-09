import re
import math
import requests
from flask import Blueprint, request, jsonify, Response
import sys, os
from flask import Flask, Blueprint, request, jsonify, Response
from flask_cors import CORS

sys.path.insert(0, os.path.dirname(__file__))

from detector import HTTMutationDetector, result_to_dict
from sequences import (
    REFERENCE_SEQUENCES,
    get_healthy_sequences,
    classify_repeat,
    predict_onset_age,
    construct_htt_exon1,
    REPEAT_CLASSIFICATION,
)
from landscape import build_fitness_landscape, build_risk_landscape, aggregation_propensity

# Canonical reference protein (your sequence)
REFERENCE_PROTEIN = """MATLEKLMKAFESLKSFQQQQQQQQQQQQQQQQQQQQQQQQPPPPPPPPPPPQLPQPPPQAQPLLPQPQPPPPPPPPPPGPAVAEEPLHRPKKELSATKKDRVNHCLTICENIVAQSVRNSPEFQKLLGIAMELFLLCSDDAESDVRMVADECLNKVIKALMDSNLPRLQLELYKEIKKNGAPRSLRAALWRFAELAHLVRPQKCRPYLVNLLPCLTRTSKRPEESVQETLAAAVPKIMASFGNFANDNEIKVLLKAFIANLKSSSPTIRRTAAGSAVSICQHSRRTQYFYSWLLNVLLGLLVPVEDEHSTLLILGVLLTLRYLVPLLQQQVKDTSLKGSFGVTRKEMEVSPSAEQLVQVYELTLHHTQHQDHNVVTGALELLQQLFRTPPPELLQTLTAVGGIGQLTAAKEESGGRSRSGSIVELIAGGGSSCSPVLSRKQKGKVLLGEEEEALEDDSESRSDVSSSALTASVKDEISGELAASSGVSTPGSAGHDIITEQPRSQHTLQADSVDLASCDLTSSATDGDEEDILSHSSSQVSAVPSDPAMDLNDGTQASSPISDSSQTTTEGPDSAVTPSDSSEIVLDGTDNQYLGLQIGQPQDEDEEATGILPDEASEAFRNSSMALQQAHLLKNMSHCRQPSDSSVDKFVLRDEATEPGDQENKPCRIKGDIGQSTDDDSAPLVHCVRLLSASFLLTGGKNVLVPDRDVRVSVKALALSCVGAAVALHPESFFSKLYKVPLDTTEYPEEQYVSDILNYIDHGDPQVRGATAILCGTLICSILSRSRFHVGDWMGTIRTLTGNTFSLADCIPLLRKTLKDESSVTCKLACTAVRNCVMSLCSSSYSELGLQLIIDVLTLRNSSYWLVRTELLETLAEIDFRLVSFLEAKAENLHRGAHHYTGLLKLQERVLNNVVIHLLGDEDPRVRHVAAASLIRLVPKLFYKCDQGQADPVVAVARDQSSVYLKLLMHETQPPSHFSVSTITRIYRGYNLLPSITDVTMENNLSRVIAAVSHELITSTTRALTFGCCEALCLLSTAFPVCIWSLGWHCGVPPLSASDESRKSCTVGMATMILTLLSSAWFPLDLSAHQDALILAGNLLAASAPKSLRSSWASEEEANPAATKQEEVWPALGDRALVPMVEQLFSHLLKVINICAHVLDDVAPGPAIKAALPSLTNPPSLSPIRRKGKEKEPGEQASVPLSPKKGSEASAASRQSDTSGPVTTSKSSSLGSFYHLPSYLKLHDVLKATHANYKVTLDLQNSTEKFGGFLRSALDVLSQILELATLQDIGKCVEEILGYLKSCFSREPMMATVCVQQLLKTLFGTNLASQFDGLSSNPSKSQGRAQRLGSSSVRPGLYHYCFMAPYTHFTQALADASLRNMVQAEQENDTSGWFDVLQKVSTQLKTNLTSVTKNRADKNAIHNHIRLFEPLVIKALKQYTTTTCVQLQKQVLDLLAQLVQLRVNYCLLDSDQVFIGFVLKQFEYIEVGQFRESEAIIPNIFFFLVLLSYERYHSKQIIGIPKIIQLCDGIMASGRKAVTHAIPALQPIVHDLFVLRGTNKADAGKELETQKEVVVSMLLRLIQYHQVLEMFILVLQQCHKENEDKWKRLSRQIADIILPMLAKQQMHIDSHEALGVLNTLFEILAPSSLRPVDMLLRSMFVTPNTMASVSTVQLWISGILAILRVLISQSTEDIVLSRIQELSFSPYLISCTVINRLRDGDSTSTLEEHSEGKQIKNLPEETFSRFLLQLVGILLEDIVTKQLKVEMSEQQHTFYCQELGTLLMCLIHIFKSGMFRRITAAATRLFRSDGCGGSFYTLDSLNLRARSMITTHPALVLLWCQILLLVNHTDYRWWAEVQQTPKRHSLSSTKLLSPQMSGEEEDSDLAAKLGMCNREIVRRGALILFCDYVCQNLHDSEHLTWLIVNHIQDLISLSHEPPVQDFISAVHRNSAASGLFIQAIQSRCENLSTPTMLKKTLQCLEGIHLSQSGAVLTLYVDRLLCTPFRVLARMVDILACRRVEMLLAANLQSSMAQLPMEELNRIQEYLQSSGLAQRHQRLYSLLDRFRLSTMQDSLSPSPPVSSHPLDGDGHVSLETVSPDKDWYVHLVKSQCWTRSDSALLEGAELVNRIPAEDMNAFMMNSEFNLSLLAPCLSLGMSEISGGQKSALFEAAREVTLARVSGTVQQLPAVHHVFQPELPAEPAAYWSKLNDLFGDAALYQSLPTLARALAQYLVVVSKLPSHLHLPPEKEKDIVKFVVATLEALSWHLIHEQIPLSLDLQAGLDCCCLALQLPGLWSVVSSTEFVTHACSLIYCVHFILEAVAVQPGEQLLSPERRTNTPKAISEEEEEVDPNTQNPKYITAACEMVAEMVESLQSVLALGHKRNSGVPAFLTPLLRNIIISLARLPLVNSYTRVPPLVWKLGWSPKPGGDFGTAFPEIPVEFLQEKEVFkEFIYRINTLGWTSRTQFEETWATLLGVLVTQPLVMEQEESPPEEDTERTQINVLAVQAITSLVLSAMTVPVAGNPAVSCLEQQPRNKPLKALDTRFGRKLSIIRGIVEQEIQAMVSKRENIATHHLYQAWDPVPSLSPATTGALISHEKLLLQINPERELGSMSYKLGQVSIHSVWLGNSITPLREEEWDEEEEEEADAPAPSSPPTSPVNSRKHRAGVDIHSCSQFLLELYSRWILPSSSARRTPAILISEVVRSLLVVSDLFTERNQFELMYVTLTELRRVHPSEDEILAQYLVPATCKAAAVLGMDKAVAEPVSRLLESTLRSSHLPSRVGALHGVLYVLECDLLDDTAKQLIPVISDYLLSNLKGIAHCVNIHSQQHVLVMCATAFYLIENYPLDVG PEFSASIIQMCGVMLSGSEESTPSIIYHCALRGLERLLLSEQLSRLDAESLVKLSVDRVNVHSPHRAMAALGLMLTCMYTGKEKVSPGRTSDPNPAAPDSESVIVAMERVSVLFDRIRKGFPCEARVVARILPQFLDDFFPPQDIMNKVIGEFLSNQQPYPQFMATVVYKVFQTLHSTGQSSMVRDWVMLSLSNFTQRAPVAMATWSLSCFFVSASTSPWVAAILPHVISRMGKLEQVDVNLFCLVATDFYRHQIEEELDRRAFQSVLEVVAAPGSPYHRLLTCLRNVHKVTTC"""

htt_bp = Blueprint("htt", __name__)
_detector = HTTMutationDetector()  # singleton – reuse across requests



def generate_dummy_helix_pdb(seq):
    """Minimal PDB fallback when ESMFold is unavailable."""
    lines = ["REMARK  ESMFold unavailable – dummy helix"]
    for i, aa in enumerate(seq[:50]):
        angle = i * 100 * (3.14159 / 180)
        x, y, z = 1.5 * __import__('math').cos(angle), 1.5 * __import__('math').sin(angle), i * 1.5
        lines.append(f"ATOM  {i+1:5d}  CA  ALA A{i+1:4d}    {x:8.3f}{y:8.3f}{z:8.3f}  1.00 50.00           C")
    lines.append("END")
    return "\n".join(lines)








# -----------------------------------------------------------------------
# POST /api/htt/detect
# -----------------------------------------------------------------------
@htt_bp.route("/detect", methods=["POST"])
def detect():
    """
    Analyze an HTT sequence.
    Request body (JSON):
        {
            "sequence": "ATGCAG...CAG...CCG...",   // DNA string
            "label": "optional label"               // optional
        }
    OR provide a CAG count directly for quick demo:
        { "cag_count": 45 }
    Response: DetectionResult as JSON
    """
    data = request.get_json(force=True)

    if not data:
        return jsonify({"error": "No JSON body provided"}), 400

    # Allow direct CAG count input (for demo/testing)
    if "cag_count" in data and "sequence" not in data:
        n = int(data["cag_count"])
        if n < 1 or n > 200:
            return jsonify({"error": "cag_count must be between 1 and 200"}), 400
        sequence = construct_htt_exon1(n)
    elif "sequence" in data:
        sequence = data["sequence"]
        # Basic validation
        valid_chars = set("ATCGatcg \n\r")
        clean = sequence.replace(" ", "").replace("\n", "").replace("\r", "")
        if not clean:
            return jsonify({"error": "Empty sequence"}), 400
        if not all(c in "ATCGatcg" for c in clean):
            return jsonify({"error": "Sequence contains non-DNA characters. Use A/T/C/G only."}), 400
        if len(clean) < 18:
            return jsonify({"error": "Sequence too short (minimum 18 bp = 6 CAG codons)"}), 400
        sequence = clean
    else:
        return jsonify({"error": "Provide either 'sequence' or 'cag_count'"}), 400

    result = _detector.detect(sequence)
    response = result_to_dict(result)
    response["label"] = data.get("label", "")
    response["sequence_length"] = len(sequence)

    return jsonify(response)


# -----------------------------------------------------------------------
# GET /api/htt/references
# -----------------------------------------------------------------------
@htt_bp.route("/references", methods=["GET"])
def references():
    """
    Return all reference sequences with their metadata.
    Used by frontend to populate comparison dropdowns.
    """
    refs = {}
    for key, info in REFERENCE_SEQUENCES.items():
        refs[key] = {
            "label": info["label"],
            "cag_repeats": info["cag_repeats"],
            "classification": info["classification"],
            "risk": info["risk"],
            "description": info["description"],
            "sequence_length": len(info["sequence"]),
            # Don't send full sequence in listing — use /detect with cag_count instead
        }
    return jsonify(refs)


# -----------------------------------------------------------------------
# GET /api/htt/landscape
# -----------------------------------------------------------------------
@htt_bp.route("/landscape", methods=["GET"])
def landscape():
    """
    Return fitness/risk landscape data for visualization.
    Query params:
        type: "fitness" | "risk" | "onset"  (default: "fitness")
        min_cag: int (default: 6)
        max_cag: int (default: 80)
    Response: array of {cag, score, classification, color, onset} objects
    """
    landscape_type = request.args.get("type", "fitness")
    min_cag = int(request.args.get("min_cag", 6))
    max_cag = int(request.args.get("max_cag", 80))

    if landscape_type == "fitness":
        data = build_fitness_landscape(min_cag, max_cag)
    elif landscape_type == "risk":
        data = build_risk_landscape(min_cag, max_cag)
    else:
        data = build_fitness_landscape(min_cag, max_cag)

    return jsonify({
        "type": landscape_type,
        "min_cag": min_cag,
        "max_cag": max_cag,
        "points": data,
        "thresholds": {
            "normal_max": 35,
            "intermediate_min": 36,
            "disease_min": 40,
            "juvenile_min": 60,
        }
    })


# -----------------------------------------------------------------------
# GET /api/htt/classify/<n>
# -----------------------------------------------------------------------
@htt_bp.route("/classify/<int:n>", methods=["GET"])
def classify(n: int):
    """Quick classification for a given CAG repeat count."""
    if n < 1 or n > 300:
        return jsonify({"error": "n must be between 1 and 300"}), 400

    classification = classify_repeat(n)
    onset = predict_onset_age(n)

    return jsonify({
        "cag_count": n,
        **classification,
        "onset_prediction": onset,
    })


# -----------------------------------------------------------------------
# GET /api/htt/healthy-sequences
# -----------------------------------------------------------------------
@htt_bp.route("/healthy-sequences", methods=["GET"])
def healthy_sequences():
    """
    Return metadata for all healthy reference sequences (CAG 6–35).
    Full sequences available by POSTing cag_count to /detect.
    """
    seqs = get_healthy_sequences()
    # Return metadata only (not full sequences — too large for listing)
    return jsonify({
        key: {k: v for k, v in val.items() if k != "sequence"}
        for key, val in seqs.items()
    })


# -----------------------------------------------------------------------
# GET /api/htt/interactions (corrected, unified route)
# -----------------------------------------------------------------------
@htt_bp.route("/interactions", methods=["GET"])
def interactions():
    """
    Gene interaction graph data for the force-directed network.
    (Merged from the duplicate; keeps the more complete version)
    """
    return jsonify({
        'nodes': [
            {'id': 'HTT_mut'}, {'id': 'BDNF'},  {'id': 'CBP'},
            {'id': 'REST'},    {'id': 'TBP'},    {'id': 'TP53'},
            {'id': 'CASP3'},   {'id': 'NFkB'},   {'id': 'PGC1a'}, {'id': 'mTOR'},
        ],
        'links': [
            {'source': 'HTT_mut', 'target': 'BDNF',  'type': 'inhibit'},
            {'source': 'HTT_mut', 'target': 'CBP',   'type': 'inhibit'},
            {'source': 'HTT_mut', 'target': 'REST',  'type': 'inhibit'},
            {'source': 'HTT_mut', 'target': 'TP53',  'type': 'activate'},
            {'source': 'HTT_mut', 'target': 'NFkB',  'type': 'activate'},
            {'source': 'TP53',    'target': 'CASP3', 'type': 'activate'},
            {'source': 'NFkB',    'target': 'CASP3', 'type': 'activate'},
            {'source': 'BDNF',    'target': 'CASP3', 'type': 'inhibit'},
            {'source': 'CBP',     'target': 'BDNF',  'type': 'activate'},
            {'source': 'mTOR',    'target': 'PGC1a', 'type': 'activate'},
            {'source': 'PGC1a',   'target': 'BDNF',  'type': 'activate'},
        ],
    })


# -----------------------------------------------------------------------
# POST /api/htt/interactions/simulate
# -----------------------------------------------------------------------
@htt_bp.route("/interactions/simulate", methods=["POST"])
def simulate_interactions():
    """Dynamic simulation of gene expression over time under mutant HTT."""
    data = request.get_json()
    cag = data.get("cag", 45)
    steps = data.get("steps", 50)          # number of time points
    dt = data.get("dt", 0.1)               # time step

    # Parameters: Hill function – effect of mutant HTT on each gene
    # Mutant HTT activity = min(1, (cag - 35) / 30) for cag > 35 else 0
    htt_activity = max(0, min(1, (cag - 35) / 30))

    # Model: dx/dt = production - degradation, with HTT repression/activation
    # Simplified linear ODEs for demonstration
    genes = ["BDNF", "CBP", "REST", "TP53", "CASP3"]
    base_expr = {"BDNF": 1.0, "CBP": 1.0, "REST": 1.0, "TP53": 0.2, "CASP3": 0.1}
    effect = {
        "BDNF": -0.8,   # repression strength
        "CBP":  -0.7,
        "REST": -0.6,
        "TP53": +0.5,
        "CASP3":+0.7,
    }
    # Degradation rates (1/time)
    decay = {g: 0.5 for g in genes}

    time = [0]
    values = {g: [base_expr[g]] for g in genes}

    for step in range(1, steps):
        t = step * dt
        time.append(round(t, 2))
        for g in genes:
            prev = values[g][-1]
            # Change = (production * (1 + htt_activity*effect[g])) - decay*prev
            prod = base_expr[g] * (1 + htt_activity * effect[g])
            # Clamp production positive
            prod = max(0.01, prod)
            dX = prod - decay[g] * prev
            new_val = prev + dX * dt
            new_val = max(0.01, min(2.0, new_val))   # between 0.01 and 2x
            values[g].append(round(new_val, 3))

    return jsonify({
        "time": time,
        "traces": values,
        "htt_activity": round(htt_activity, 3),
        "cag": cag
    })


# -----------------------------------------------------------------------
# POST /api/htt/heredity/simulate
# -----------------------------------------------------------------------
@htt_bp.route("/heredity/simulate", methods=["POST"])
def heredity_simulate():
    data = request.get_json()
    founder_cag = int(data.get("founder_cag", 40))
    generations = int(data.get("generations", 5))
    child_observed_cag = data.get("child_cag", None)   # optional

    # Model: each transmission adds ΔCAG ~ Normal(mean_inc, sd) but only if >35
    # Parameters from literature: mean increase ~1–2 per generation, SD ~3
    mean_inc = 1.5
    sd_inc = 3.0

    # Build a binary tree (each parent gives two children, but we'll keep small)
    import random
    random.seed(42)   # reproducible

    # Node: {id, cag, generation, parent_id, sex, affected, onset}
    nodes = []
    edges = []
    node_id = 0

    def add_node(cag, gen, parent_id=None):
        nonlocal node_id
        classification = classify_repeat(cag)
        affected = cag >= 40
        onset = predict_onset_age(cag) if affected else None
        nodes.append({
            "id": node_id,
            "cag": cag,
            "generation": gen,
            "parent_id": parent_id,
            "affected": affected,
            "risk_label": classification["risk"],
            "onset_median": onset["median_onset"] if onset else None,
            "color": classification["color"]
        })
        if parent_id is not None:
            edges.append({"from": parent_id, "to": node_id})
        node_id += 1
        return node_id - 1

    # Founder (generation 0)
    add_node(founder_cag, 0)

    current_ids = [0]   # start with founder
    for gen in range(1, generations+1):
        next_ids = []
        for pid in current_ids:
            p_cag = nodes[pid]["cag"]
            # Two children
            for _ in range(2):
                if p_cag <= 35:
                    # stable transmission
                    child_cag = p_cag
                else:
                    # expansion
                    delta = random.gauss(mean_inc, sd_inc)
                    child_cag = max(p_cag + delta, p_cag)  # never shrink below parent
                    # but cap at 120
                    child_cag = min(120, int(round(child_cag)))
                # If child_observed_cag is given and this is last generation, override
                if child_observed_cag is not None and gen == generations and len(next_ids) == 0:
                    child_cag = child_observed_cag
                cid = add_node(child_cag, gen, pid)
                next_ids.append(cid)
        current_ids = next_ids

    return jsonify({
        "nodes": nodes,
        "edges": edges,
        "generations": generations,
        "founder_cag": founder_cag
    })


# -----------------------------------------------------------------------
# GET /api/htt/protein/structure
# -----------------------------------------------------------------------
@htt_bp.route("/protein/structure", methods=["GET"])
def protein_structure():
    cag = int(request.args.get("cag", 20))
    agg_score = aggregation_propensity(cag)
    
    # Generate a helix-like point cloud for the polyQ chain
    # Each residue at (x, y, z) on a cylinder with twist
    residues = []
    radius = 1.2
    pitch = 1.5
    for i in range(cag):
        angle = i * 2 * math.pi / 3.6   # 3.6 residues per turn
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        z = i * pitch / 3.6
        # Colour based on position and aggregation score: early residues green, later red if long
        t = i / max(1, cag)
        color = f"hsl({int(120 - 120 * t * agg_score)}, 70%, 50%)"
        residues.append({
            "index": i,
            "x": round(x, 3),
            "y": round(y, 3),
            "z": round(z, 3),
            "color": color,
            "residue": "Q"
        })
    return jsonify({
        "cag": cag,
        "aggregation_score": agg_score,
        "residues": residues,
        "helix_params": {"radius": radius, "pitch": pitch, "turns": cag / 3.6}
    })


# -----------------------------------------------------------------------
# POST /api/htt/compare
# -----------------------------------------------------------------------
@htt_bp.route("/compare", methods=["POST"])
def compare_to_reference():
    data = request.get_json()
    seq_or_cag = data.get("sequence") or data.get("cag_count")
    if not seq_or_cag:
        return jsonify({"error": "Provide 'sequence' or 'cag_count'"}), 400

    # Run detection
    if "cag_count" in data:
        cag = int(data["cag_count"])
        sequence = construct_htt_exon1(cag)
    else:
        sequence = seq_or_cag.upper().strip()
        # Quick CAG extraction from sequence
        cag_match = re.search(r'(CAG)+', sequence)
        cag = len(cag_match.group()) // 3 if cag_match else 0

    result = _detector.detect(sequence)

    # Reference CAG length (extracted from REFERENCE_PROTEIN)
    ref_match = re.search(r'SF(Q+)', REFERENCE_PROTEIN)
    ref_cag = len(ref_match.group(1)) if ref_match else 24
    input_protein_polyq = result.cag_count

    # Build mutated protein sequence by replacing polyQ in reference
    def replace_polyq(protein, new_len):
        new_q = "Q" * new_len
        return re.sub(r'(SF)(Q+)', lambda m: m.group(1) + new_q, protein)

    normal_protein = REFERENCE_PROTEIN
    mutated_protein = replace_polyq(normal_protein, input_protein_polyq)

    # Compute differences
    diff_summary = {
        "cag_reference": ref_cag,
        "cag_input": result.cag_count,
        "cag_difference": result.cag_count - ref_cag,
        "classification_reference": "normal",
        "classification_input": result.classification["cls"],
        "flanks_intact_reference": True,
        "flanks_intact_input": result.flanks_intact,
        "interruptions": result.interruptions,
        "mutation_type": result.mutation_type,
    }

    return jsonify({
        "detection_result": result_to_dict(result),
        "comparison": diff_summary,
        "normal_protein": normal_protein,
        "mutated_protein": mutated_protein,
        "reference_cag": ref_cag,
    })


# -----------------------------------------------------------------------
# POST /api/htt/protein/analyze
# -----------------------------------------------------------------------
@htt_bp.route("/protein/analyze", methods=["POST"])
def analyze_protein():
    """
    Analyze a protein sequence for polyQ mutations and return 3D structure data.
    Expected JSON: { "sequence": "MATLEKLMKAFESLKSFQQQ...", "reference_cag": 24 (optional) }
    """
    data = request.get_json()
    protein_seq = data.get("sequence", "").upper().strip()
    if not protein_seq:
        return jsonify({"error": "No protein sequence provided"}), 400

    # Find the longest run of Q (polyQ tract)
    q_matches = list(re.finditer(r'Q+', protein_seq))
    if not q_matches:
        return jsonify({"error": "No polyQ repeat found (no consecutive Q residues)"}), 400

    # Take the longest run as the main polyQ
    main_q = max(q_matches, key=lambda m: m.end() - m.start())
    polyq_len = main_q.end() - main_q.start()
    polyq_start = main_q.start()
    polyq_seq = main_q.group()

    # Interruptions (non-Q within the polyQ stretch)
    interruptions = []
    for i, ch in enumerate(polyq_seq):
        if ch != 'Q':
            interruptions.append({"position": polyq_start + i, "residue": ch})

    # Compare with reference length (default 24)
    ref_len = data.get("reference_cag", 24)
    difference = polyq_len - ref_len
    mutation_type = "expansion" if difference > 0 else "contraction" if difference < 0 else "none"

    # Classification
    if polyq_len <= 26:
        classification = "normal"
    elif polyq_len <= 35:
        classification = "normal_high"
    elif polyq_len <= 39:
        classification = "intermediate"
    elif polyq_len <= 59:
        classification = "full_penetrance"
    else:
        classification = "juvenile"

    # Generate 3D helix coordinates for the polyQ chain
    residues_3d = []
    radius = 1.4
    pitch = 0.45
    turns = polyq_len / 3.6
    start_y = -turns * pitch / 2

    for i in range(polyq_len):
        angle = (i / 3.6) * 2 * math.pi
        x = radius * math.cos(angle)
        z = radius * math.sin(angle)
        y = start_y + i * pitch

        # Colour coding based on position and pathogenic status
        t = i / max(1, polyq_len - 1)
        if polyq_len <= 35:
            r, g, b = 29, 158, 117  # green base
        elif polyq_len <= 39:
            r, g, b = 186, 117, 23   # orange
        else:
            # gradient from orange to red as i increases
            ratio = min(1, t * 2)
            r = int(186 + (226 - 186) * ratio)
            g = int(117 + (75 - 117) * ratio)
            b = int(23 + (74 - 23) * ratio)

        residues_3d.append({
            "index": i,
            "x": round(x, 3),
            "y": round(y, 3),
            "z": round(z, 3),
            "color": f"rgb({r},{g},{b})",
            "is_expanded": i >= ref_len if difference > 0 else False,
        })

    return jsonify({
        "polyq_length": polyq_len,
        "polyq_sequence": polyq_seq,
        "reference_length": ref_len,
        "difference": difference,
        "mutation_type": mutation_type,
        "classification": classification,
        "interruptions": interruptions,
        "residues": residues_3d,
        "aggregation_score": round(aggregation_propensity(polyq_len), 4),
        "normal_polyq_length": ref_len,
    })


# -----------------------------------------------------------------------
# POST /api/htt/drug/simulate
# -----------------------------------------------------------------------
@htt_bp.route("/drug/simulate", methods=["POST"])
def simulate_drug_interaction():
    """
    Simulate drug binding to mutant HTT polyQ domain.
    Request: { "cag": int, "drug_concentration": float (uM), "drug_type": string }
    Response: binding_affinity, delta_g, effect_on_fitness, etc.
    """
    data = request.get_json()
    cag = int(data.get("cag", 45))
    conc = float(data.get("drug_concentration", 10.0))      # µM
    drug_type = data.get("drug_type", "polyQ_binder")

    # 1. Baseline binding affinity (Kd in µM) for a hypothetical drug
    base_kd = 50.0   # µM for CAG=40
    if cag <= 35:
        kd = 200.0   # very weak binding to normal polyQ
    else:
        excess = max(0, cag - 35)
        kd = base_kd * math.exp(-0.08 * excess)
        kd = max(0.5, min(200, kd))

    # 2. Fraction bound (Langmuir isotherm)
    bound_frac = conc / (conc + kd) if conc + kd > 0 else 0.0
    bound_frac = min(1.0, bound_frac)

    # 3. Free energy of binding ΔG = RT ln(Kd)  (in kcal/mol, R=1.987e-3, T=310K)
    delta_g = 1.987e-3 * 310 * math.log(kd)  # positive, but we'll make negative for display
    delta_g_kcal = round(-delta_g, 2) if kd < 1e6 else 0.0

    # 4. Effect on protein fitness / aggregation
    agg_before = aggregation_propensity(cag)
    # Since composite_fitness may not exist, we'll define a simple fitness proxy
    # Replace this with your actual function if you have it.
    if hasattr(sys.modules['landscape'], 'composite_fitness'):
        from landscape import composite_fitness
        fitness_before = composite_fitness(cag)
    else:
        # Rough fitness: 1 - agg_score
        fitness_before = 1 - agg_before

    # Drug reduces aggregation propensity proportionally to binding occupancy
    agg_reduction = bound_frac * 0.8
    agg_after = agg_before * (1 - agg_reduction)
    # Fitness improves as aggregation decreases
    fitness_improvement = bound_frac * min(0.5, (cag - 35) / 50.0)   # up to +0.5
    fitness_after = min(1.0, fitness_before + fitness_improvement)

    return jsonify({
        "cag": cag,
        "drug_concentration": conc,
        "drug_type": drug_type,
        "binding_affinity_kd_um": round(kd, 2),
        "bound_fraction": round(bound_frac, 3),
        "delta_g_kcal": delta_g_kcal,
        "aggregation_before": round(agg_before, 4),
        "aggregation_after": round(agg_after, 4),
        "fitness_before": round(fitness_before, 4),
        "fitness_after": round(fitness_after, 4),
        "fitness_improvement": round(fitness_after - fitness_before, 4),
    })


# -----------------------------------------------------------------------
# GET /api/htt/fold
# -----------------------------------------------------------------------
@htt_bp.route('/fold', methods=['POST'])
def fold_sequence():
    """
    Proxy to ESMFold.
    Body: { "sequence": "MATLEKLMK..." }   (amino-acid string)
    Returns: PDB text as plain text
    """
    data = request.get_json(force=True)
    seq  = data.get('sequence', '').strip()
    if not seq:
        return jsonify(error='sequence required'), 400
    if len(seq) > 400:
        return jsonify(error='Sequence too long for ESMFold (max ~400 aa in free tier). Trim or use paid API.'), 413

    resp = requests.post(
        'https://api.esmatlas.com/foldSequence/v1/pdb/',
        data=seq,
        headers={'Content-Type': 'text/plain'},
        timeout=120,
    )
    if not resp.ok:
        return jsonify(error=f'ESMFold error {resp.status_code}', detail=resp.text), 502

    return Response(resp.text, mimetype='text/plain')


# -----------------------------------------------------------------------
# GET /api/htt/normal_structure
# -----------------------------------------------------------------------
@htt_bp.route('/normal_structure', methods=['GET'])
def normal_structure():
    """
    Proxy AlphaFold DB PDB for human HTT (P42858).
    Returns PDB text.
    """
    url  = 'https://alphafold.ebi.ac.uk/files/AF-P42858-F1-model_v4.pdb'
    resp = requests.get(url, timeout=30)
    if not resp.ok:
        return jsonify(error='AlphaFold DB unavailable'), 502
    return Response(resp.text, mimetype='text/plain')


# -----------------------------------------------------------------------
# GET /api/htt/drug_interaction (ChEMBL proxy)
# -----------------------------------------------------------------------
@htt_bp.route('/drug_interaction', methods=['GET'])
def drug_interaction():
    """
    Proxy ChEMBL activity query.
    Query params: ?molecule_chembl_id=CHEMBL1200497
    Returns ChEMBL JSON activity list.
    """
    mol_id = request.args.get('molecule_chembl_id')
    if not mol_id:
        return jsonify(error='molecule_chembl_id required'), 400

    url = (
        f'https://www.ebi.ac.uk/chembl/api/data/activity.json'
        f'?molecule_chembl_id={mol_id}'
        f'&target_chembl_id=CHEMBL2093872'   # Huntingtin
        f'&limit=5&format=json'
    )
    resp = requests.get(url, timeout=20)
    if not resp.ok:
        return jsonify(error=f'ChEMBL error {resp.status_code}'), 502
    return jsonify(resp.json())

# ==================== AlphaFold / ESMFold Proxies ====================

@htt_bp.route("/alphafold/normal", methods=["GET"])
def get_normal_htt_pdb():
    """Fetch normal Huntingtin PDB from AlphaFold DB (no CORS)."""
    import requests
    url = "https://alphafold.ebi.ac.uk/files/AF-P42858-F1-model_v4.pdb"
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        return resp.text, 200, {'Content-Type': 'text/plain'}
    except Exception as e:
        return jsonify({"error": f"AlphaFold DB fetch failed: {str(e)}"}), 500


@htt_bp.route("/esmfold/fold", methods=["POST"])
def fold_esmfold():
    """
    Proxy for ESMFold API (Meta). 
    Accepts JSON: {"sequence": "MATE..."}
    Returns PDB text.
    """
    import requests
    data = request.get_json()
    seq = data.get("sequence")
    if not seq:
        return jsonify({"error": "No sequence provided"}), 400

    # ESMFold endpoint (Meta's official API)
    url = "https://api.esmatlas.com/foldSequence/v1/pdb/"
    try:
        resp = requests.post(url, data=seq, headers={'Content-Type': 'text/plain'}, timeout=60)
        resp.raise_for_status()
        return resp.text, 200, {'Content-Type': 'text/plain'}
    except requests.exceptions.RequestException as e:
        # Fallback to a dummy helix for demo (if rate limited)
        return generate_dummy_helix_pdb(seq), 200, {'Content-Type': 'text/plain'}
    except Exception as e:
        return jsonify({"error": f"ESMFold failed: {str(e)}"}), 500

# -----------------------------------------------------------------------
# POST /api/htt/drug/kinetics
# Nucleation-elongation aggregation kinetics model (Oosawa model)
# With vs without drug, returns time-series data
# -----------------------------------------------------------------------
@htt_bp.route('/drug/kinetics', methods=['POST'])
def drug_kinetics():
    data        = request.get_json()
    cag         = int(data.get('cag', 45))
    conc        = float(data.get('drug_concentration', 10.0))
    drug_type   = data.get('drug_type', 'polyQ_binder')
    time_points = int(data.get('time_points', 100))
    t_max       = float(data.get('t_max', 48.0))   # hours

    agg = aggregation_propensity(cag)

    # Nucleation-elongation (Oosawa-Kasai) simplified:
    # dM/dt = k_n * C^n * (1 - M) + k_e * C * M  -  k_off * M
    # M = fraction aggregated (0→1), C = monomer concentration (normalized =1)
    # Parameters scale with polyQ length
    k_n   = 0.002 * agg           # nucleation rate (slow, length-dependent)
    k_e   = 0.15  * agg           # elongation rate
    k_off = 0.01                   # dissociation
    n_exp = 2                      # nucleation cooperativity

    # Drug effect: reduces k_n and k_e proportionally to bound fraction
    # Compute Kd and bound fraction (same model as /drug/simulate)
    if cag <= 35:
        kd = 200.0
    else:
        kd = 50.0 * math.exp(-0.08 * max(0, cag - 35))
        kd = max(0.5, min(200, kd))
    bound_frac = conc / (conc + kd) if conc + kd > 0 else 0.0

    drug_effect_kn = 1 - bound_frac * 0.85   # drug suppresses nucleation strongly
    drug_effect_ke = 1 - bound_frac * 0.60   # less effect on elongation

    dt = t_max / time_points
    times       = []
    no_drug     = []
    with_drug   = []
    M_nd = 0.0001   # seed
    M_wd = 0.0001

    for i in range(time_points):
        t = i * dt
        times.append(round(t, 3))
        no_drug.append(round(M_nd, 4))
        with_drug.append(round(M_wd, 4))

        # No-drug ODE step (Euler)
        dM_nd = (k_n * (1 - M_nd)**n_exp + k_e * M_nd * (1 - M_nd) - k_off * M_nd)
        M_nd  = min(1.0, max(0.0, M_nd + dM_nd * dt))

        # With-drug ODE step
        dM_wd = (k_n * drug_effect_kn * (1 - M_wd)**n_exp
                 + k_e * drug_effect_ke * M_wd * (1 - M_wd)
                 - k_off * M_wd)
        M_wd  = min(1.0, max(0.0, M_wd + dM_wd * dt))

    # Lag phase: time to reach 10% aggregation
    def lag_phase(series, threshold=0.1):
        for idx, v in enumerate(series):
            if v >= threshold:
                return round(idx * dt, 2)
        return t_max   # never reached

    return jsonify({
        'times':            times,
        'no_drug':          no_drug,
        'with_drug':        with_drug,
        'lag_no_drug':      lag_phase(no_drug),
        'lag_with_drug':    lag_phase(with_drug),
        'bound_fraction':   round(bound_frac, 3),
        'kd_um':            round(kd, 2),
        'k_n':              round(k_n, 5),
        'k_e':              round(k_e, 5),
        'cag':              cag,
        'agg_propensity':   round(agg, 4),
    })


# -----------------------------------------------------------------------
# POST /api/htt/drug/accessibility
# Compute per-residue drug accessibility from ESMFold pLDDT
# pLDDT < 50 → disordered → drug-accessible
# Returns residue index, pLDDT score, accessibility label, and color
# -----------------------------------------------------------------------
@htt_bp.route('/drug/accessibility', methods=['POST'])
def drug_accessibility():
    data    = request.get_json()
    sequence = data.get('sequence', '').strip()
    cag     = int(data.get('cag', 45))

    if not sequence:
        return jsonify({'error': 'sequence required'}), 400

    # Fetch ESMFold PDB via internal call (reuse existing logic)
    seq_to_fold = sequence[:400]
    try:
        resp = requests.post(
            'https://api.esmatlas.com/foldSequence/v1/pdb/',
            data=seq_to_fold,
            headers={'Content-Type': 'text/plain'},
            timeout=60,
        )
        resp.raise_for_status()
        pdb_text = resp.text
    except Exception:
        # Fallback: synthesize pLDDT from sequence properties
        pdb_text = None

    residues = []

    if pdb_text:
        # Parse B-factor column (cols 61-66) from ATOM records — that's pLDDT in AF/ESMFold
        seen = set()
        for line in pdb_text.splitlines():
            if not line.startswith('ATOM'):
                continue
            atom_name = line[12:16].strip()
            if atom_name != 'CA':       # one value per residue via Cα
                continue
            res_seq = int(line[22:26].strip())
            if res_seq in seen:
                continue
            seen.add(res_seq)
            try:
                plddt = float(line[60:66].strip())
            except ValueError:
                plddt = 50.0
            residues.append({'index': res_seq - 1, 'plddt': plddt})
    else:
        # Fallback heuristic: polyQ region gets low pLDDT, flanks get higher
        polyq_start = sequence.find('Q' * min(cag, 5)) if cag >= 5 else -1
        for i, aa in enumerate(seq_to_fold):
            in_polyq = polyq_start != -1 and polyq_start <= i < polyq_start + cag
            plddt = 25.0 + (10.0 * (i / len(seq_to_fold))) if in_polyq else 60.0 + 20.0 * (i / len(seq_to_fold))
            plddt = min(95.0, plddt)
            residues.append({'index': i, 'plddt': round(plddt, 1)})

    # Annotate accessibility
    def accessibility(plddt):
        if plddt < 50:  return {'label': 'Disordered',   'color': '#E24B4A', 'score': 1.0}
        if plddt < 70:  return {'label': 'Flexible',     'color': '#F5C518', 'score': 0.6}
        if plddt < 90:  return {'label': 'Structured',   'color': '#56AEE2', 'score': 0.2}
        return              {'label': 'Rigid',          'color': '#1565C0', 'score': 0.05}

    annotated = []
    for r in residues:
        acc = accessibility(r['plddt'])
        annotated.append({
            'index':       r['index'],
            'residue':     sequence[r['index']] if r['index'] < len(sequence) else '?',
            'plddt':       r['plddt'],
            'label':       acc['label'],
            'color':       acc['color'],
            'drug_access': acc['score'],
        })

    # Find highest-accessibility windows (candidate binding sites)
    window = 5
    hotspots = []
    for i in range(len(annotated) - window):
        w = annotated[i:i+window]
        avg_acc = sum(x['drug_access'] for x in w) / window
        if avg_acc > 0.7:
            hotspots.append({
                'start': i,
                'end':   i + window,
                'score': round(avg_acc, 3),
            })

    return jsonify({
        'residues':  annotated,
        'hotspots':  hotspots,
        'cag':       cag,
        'source':    'esmfold' if pdb_text else 'heuristic',
        'total':     len(annotated),
    })


# -----------------------------------------------------------------------
# POST /api/htt/drug/landscape_shift
# Fitness landscape before vs after drug treatment
# -----------------------------------------------------------------------
@htt_bp.route('/drug/landscape_shift', methods=['POST'])
def drug_landscape_shift():
    data = request.get_json()
    cag  = int(data.get('cag', 45))
    conc = float(data.get('drug_concentration', 10.0))

    points = []
    for c in range(6, 81):
        agg = aggregation_propensity(c)
        fitness_before = round(1 - agg, 4)

        if c <= 35:
            kd = 200.0
        else:
            kd = 50.0 * math.exp(-0.08 * max(0, c - 35))
            kd = max(0.5, min(200, kd))
        bf = conc / (conc + kd)
        fitness_after = round(min(1.0, fitness_before + bf * min(0.5, (c - 35) / 50.0 if c > 35 else 0)), 4)

        points.append({
            'cag':            c,
            'fitness_before': fitness_before,
            'fitness_after':  fitness_after,
            'delta':          round(fitness_after - fitness_before, 4),
        })

    return jsonify({'points': points, 'highlight_cag': cag, 'concentration': conc})


app = Flask(__name__)
CORS(app)                          # ← CORS goes HERE, after app exists

# Register the blueprint (routes stay on htt_bp, mounted at /api/htt)
app.register_blueprint(htt_bp, url_prefix='/api/htt')

if __name__ == '__main__':
    app.run(debug=True, port=5000)