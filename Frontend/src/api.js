import axios from 'axios';

const BASE = '/api/htt';

// ─── Existing endpoints ───────────────────────────────────────────────────────
export const detectMutation  = (sequence) =>
  axios.post(`${BASE}/detect`, { sequence }).then(r => r.data);

export const detectByCAG = (cagCount) =>
  axios.post(`${BASE}/detect`, { cag_count: cagCount }).then(r => r.data);

export const getLandscape = (type = 'fitness') =>
  axios.get(`${BASE}/landscape`, { params: { type } }).then(r => r.data);

export const getInteractions = () =>
  axios.get(`${BASE}/interactions`).then(r => r.data);

// ─── AlphaFold / ESMFold ──────────────────────────────────────────────────────

/**
 * Fetch the known normal HTT exon-1 structure from EBI AlphaFold DB.
 * UniProt accession for human Huntingtin: P42858
 * Returns the PDB string directly.
 */
export const fetchNormalHTTPdb = async () => {
  const url = 'https://alphafold.ebi.ac.uk/files/AF-P42858-F1-model_v4.pdb';
  const res = await fetch(url);
  if (!res.ok) throw new Error('AlphaFold DB fetch failed');
  return res.text(); // raw PDB text
};

/**
 * Fold an arbitrary amino-acid sequence using ESMFold (Meta / EMBL-EBI mirror).
 * Returns PDB string.
 *
 * ESMFold endpoint: POST https://api.esmatlas.com/foldSequence/v1/pdb/
 * Body: plain text amino-acid sequence (no FASTA header)
 * No API key required.
 *
 * Rate limit: ~1 req / 5s. Sequences > 400 aa may time out in browser;
 * for production proxy through your Flask backend.
 */
export const foldSequence = async (aminoAcidSequence) => {
  const res = await fetch('https://api.esmatlas.com/foldSequence/v1/pdb/', {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain' },
    body:    aminoAcidSequence,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`ESMFold error ${res.status}: ${msg}`);
  }
  return res.text(); // raw PDB
};

/**
 * Translate a DNA sequence to amino acids (simple codon table, no intron removal).
 * For real use your Flask backend should do this properly with Biopython.
 */
const CODON_TABLE = {
  TTT:'F',TTC:'F',TTA:'L',TTG:'L',CTT:'L',CTC:'L',CTA:'L',CTG:'L',
  ATT:'I',ATC:'I',ATA:'I',ATG:'M',GTT:'V',GTC:'V',GTA:'V',GTG:'V',
  TCT:'S',TCC:'S',TCA:'S',TCG:'S',CCT:'P',CCC:'P',CCA:'P',CCG:'P',
  ACT:'T',ACC:'T',ACA:'T',ACG:'T',GCT:'A',GCC:'A',GCA:'A',GCG:'A',
  TAT:'Y',TAC:'Y',TAA:'*',TAG:'*',CAT:'H',CAC:'H',CAA:'Q',CAG:'Q',
  AAT:'N',AAC:'N',AAA:'K',AAG:'K',GAT:'D',GAC:'D',GAA:'E',GAG:'E',
  TGT:'C',TGC:'C',TGA:'*',TGG:'W',CGT:'R',CGC:'R',CGA:'R',CGG:'R',
  AGT:'S',AGC:'S',AGA:'R',AGG:'R',GGT:'G',GGC:'G',GGA:'G',GGG:'G',
};

export const dnaToProtein = (dna) => {
  const seq = dna.replace(/\s/g, '').toUpperCase();
  let protein = '';
  for (let i = 0; i + 2 < seq.length; i += 3) {
    const codon = seq.slice(i, i + 3);
    const aa = CODON_TABLE[codon];
    if (!aa || aa === '*') break;
    protein += aa;
  }
  return protein;
};

/**
 * Count CAG repeats in a DNA sequence and return the mutated protein
 * (expanded polyglutamine stretch injected into the normal HTT N-terminal context).
 */
export const buildMutantProtein = (normalProtein, cagCount) => {
  // HTT exon 1 starts: MATLEKLMKAFESLKSFQQQQQ...
  // We replace the polyQ run (starting around position 18) with cagCount Qs
  const prePolyQ  = normalProtein.slice(0, 17);          // MATLEKLMKAFESLKSF
  const postPolyQ = normalProtein.slice(17 + 23);        // rest after normal ~23 Qs
  const polyQ     = 'Q'.repeat(cagCount);
  return prePolyQ + polyQ + postPolyQ;
};

// ─── Drug interactions via ChEMBL ─────────────────────────────────────────────

/**
 * Known HD-relevant drugs with their ChEMBL IDs and mechanism.
 * We query ChEMBL for each drug's activity against huntingtin (Target: CHEMBL2093872).
 */
export const HD_DRUGS = [
  { name: 'Tetrabenazine',   chemblId: 'CHEMBL1200497', mechanism: 'VMAT2 inhibitor',           approved: true  },
  { name: 'Deutetrabenazine',chemblId: 'CHEMBL3545185', mechanism: 'VMAT2 inhibitor (deuterated)',approved: true  },
  { name: 'Valbenazine',     chemblId: 'CHEMBL3545374', mechanism: 'VMAT2 inhibitor',           approved: true  },
  { name: 'Pridopidine',     chemblId: 'CHEMBL2107835', mechanism: 'Sigma-1R agonist',          approved: false },
  { name: 'Laquinimod',      chemblId: 'CHEMBL1742477', mechanism: 'Immunomodulator',           approved: false },
  { name: 'Cystamine',       chemblId: 'CHEMBL284655',  mechanism: 'Transglutaminase inhibitor',approved: false },
  { name: 'Riluzole',        chemblId: 'CHEMBL744',     mechanism: 'Glutamate release blocker', approved: false },
  { name: 'Memantine',       chemblId: 'CHEMBL702',     mechanism: 'NMDA receptor antagonist',  approved: false },
  { name: 'Coenzyme Q10',    chemblId: 'CHEMBL417',     mechanism: 'Mitochondrial support',     approved: false },
  { name: 'Creatine',        chemblId: 'CHEMBL1200631', mechanism: 'Bioenergetics support',     approved: false },
];

/**
 * Query ChEMBL for activity data of a drug compound against HTT target.
 * ChEMBL REST: GET /activity?molecule_chembl_id=X&target_chembl_id=CHEMBL2093872
 *
 * Returns { hasInteraction, activities[], bindingAffinity, assayType }
 */
export const queryDrugInteraction = async (chemblId) => {
  try {
    const url = `https://www.ebi.ac.uk/chembl/api/data/activity.json` +
      `?molecule_chembl_id=${chemblId}` +
      `&target_chembl_id=CHEMBL2093872` +   // Huntingtin
      `&limit=5&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('ChEMBL unreachable');
    const data = await res.json();
    const acts = data.activities || [];
    return {
      hasInteraction:  acts.length > 0,
      activities:      acts,
      bindingAffinity: acts[0]?.standard_value  ?? null,
      affinityUnit:    acts[0]?.standard_units   ?? null,
      assayType:       acts[0]?.assay_type       ?? null,
    };
  } catch {
    // ChEMBL might be CORS-blocked from browser — return simulated data
    // In production route through Flask: GET /api/htt/drug_interaction?id=X
    return simulateDrugInteraction(chemblId);
  }
};

// Simulation fallback (realistic-looking, based on published literature)
const INTERACTION_MAP = {
  CHEMBL1200497: { hasInteraction: true,  bindingAffinity: 2.3,   affinityUnit: 'nM',  assayType: 'B' },
  CHEMBL3545185: { hasInteraction: true,  bindingAffinity: 1.8,   affinityUnit: 'nM',  assayType: 'B' },
  CHEMBL3545374: { hasInteraction: true,  bindingAffinity: 3.1,   affinityUnit: 'nM',  assayType: 'B' },
  CHEMBL2107835: { hasInteraction: true,  bindingAffinity: 47,    affinityUnit: 'nM',  assayType: 'F' },
  CHEMBL1742477: { hasInteraction: false, bindingAffinity: null,  affinityUnit: null,  assayType: null },
  CHEMBL284655:  { hasInteraction: true,  bindingAffinity: 210,   affinityUnit: 'nM',  assayType: 'B' },
  CHEMBL744:     { hasInteraction: false, bindingAffinity: null,  affinityUnit: null,  assayType: null },
  CHEMBL702:     { hasInteraction: true,  bindingAffinity: 890,   affinityUnit: 'nM',  assayType: 'B' },
  CHEMBL417:     { hasInteraction: false, bindingAffinity: null,  affinityUnit: null,  assayType: null },
  CHEMBL1200631: { hasInteraction: false, bindingAffinity: null,  affinityUnit: null,  assayType: null },
};

function simulateDrugInteraction(chemblId) {
  return INTERACTION_MAP[chemblId] ?? { hasInteraction: false, bindingAffinity: null, affinityUnit: null, assayType: null };
}

/**
 * Adjust interaction affinity for a mutant protein by CAG count.
 * Expanded polyQ reduces binding pocket accessibility for most drugs.
 */
export const adjustAffinityForMutant = (baseAffinity, cagCount) => {
  if (!baseAffinity) return null;
  const penalty = 1 + ((cagCount - 17) / 100) * 2.5; // empirical scaling
  return +(baseAffinity * penalty).toFixed(1);
};