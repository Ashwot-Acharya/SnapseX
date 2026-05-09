import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════════════
// HTT GENE REGULATORY NETWORK — Full Literature-Based ODE Simulation
//
// SOURCES:
//  Sp1/HDBP/CTCF → HTT promoter:     Li et al. 2012 J Mol Neurosci; PMC11546943
//  NF-κB/STAT1 repression:            PMC6294578; PMC11546943
//  REST/NRSF → BDNF:                  Zuccato et al. 2003 Nat Genet; PMC3001865
//  mHTT sequesters CBP/p300/PCAF:     Steffan et al. 2000 PNAS; PMC3805871
//  mHTT sequesters TBP/TAFII130:      Nucifora 2001 Science; PMC4082751
//  mHTT sequesters Sp1:               Buckley 2010 PLoS ONE; PMC3001865
//  mHTT → p53 → apoptosis:           PMC6433789; PMC2757461
//  PGC-1α/SIRT1/AMPK axis:           PMC2757461; PMC6433789
//  mHTT → DRP1 → mitochondria:       PMC8354140; biorxiv 2025
//  UPS/proteasome collapse:           PMC6320389; PMC10013475
//  miR-9, miR-132, miR-214, miR-124: PMC8354140; PMC9520620; PMC3759948
//  TWIST1/SIX1 TF upregulation:      bioRxiv 2024.05.20
//  HSF1 stress response:              PMC6433789
//  BDNF→TrkB→CREB feedback:          Zuccato & Cattaneo 2007 Nat Rev Neurosci
//  Autophagy/mTOR/Beclin1:           PMC6320389
// ═══════════════════════════════════════════════════════════════════════════════════════

// ── Hill kinetics ──────────────────────────────────────────────────────────────────────
const ha = (x, K = 1, n = 2) => { const xn = Math.pow(Math.max(x,0),n); return xn/(Math.pow(K,n)+xn); };
const hr = (x, K = 1, n = 2) => 1 / (1 + Math.pow(Math.max(x,0)/K, n));

// ── NODE CATALOGUE ─────────────────────────────────────────────────────────────────────
// Each node: { id, label, type, layer, x, y, desc, source, gateType? }
// layer: upstream_reg | dna | mRNA | protein | effector | output | miRNA | pathology
const NODES = [
  // ── LAYER 0: Upstream Regulators (TFs binding HTT promoter) ──
  { id:"CTCF",     label:"CTCF",         type:"tf_pos",    layer:"upstream_reg", x:60,  y:60,
    desc:"CCCTC-binding factor. Positive regulator of HTT transcription via chromatin looping at promoter. Binding sites within −1300 bp to TSS.",
    source:"PMC11546943; PMC6294578" },
  { id:"SP1",      label:"Sp1",          type:"tf_pos",    layer:"upstream_reg", x:60,  y:160,
    desc:"Specificity Protein 1. Primary activator of HTT promoter via 11 binding sites including 20 bp tandem repeats (−212 to −173 bp). In HD: partially sequestered by mHTT; aberrantly activates REST promoter.",
    source:"Li et al. 2012 J Mol Neurosci; Buckley 2010 PLoS ONE" },
  { id:"SP3",      label:"Sp3",          type:"tf_neg",    layer:"upstream_reg", x:60,  y:260,
    desc:"Specificity Protein 3. Antagonist of Sp1 — acts as repressor at REST promoter in healthy neurons. Ratio of Sp1/Sp3 determines REST expression level.",
    source:"PMC3001865 (Buckley 2010)" },
  { id:"HDBP1",    label:"HDBP1",        type:"tf_pos",    layer:"upstream_reg", x:60,  y:340,
    desc:"Huntingtin Downstream Promoter Binding Protein 1. Shares binding site with Sp1 in 20 bp repeats (−212 to −173). Positive regulator of HTT expression.",
    source:"PMC11546943" },
  { id:"HDBP2",    label:"HDBP2",        type:"tf_pos",    layer:"upstream_reg", x:60,  y:420,
    desc:"Huntingtin Downstream Promoter Binding Protein 2. Co-occupies Sp1 binding region. Positive regulator of HTT expression.",
    source:"PMC11546943" },
  { id:"NF_kB",   label:"NF-κB",        type:"tf_neg",    layer:"upstream_reg", x:60,  y:500,
    desc:"Nuclear Factor kappa B. Negative regulator of HTT transcription via promoter binding site. Experimental data confirm binding; HD-specific role unclear.",
    source:"PMC11546943; PMC6294578" },
  { id:"STAT1",    label:"STAT1",        type:"tf_neg",    layer:"upstream_reg", x:60,  y:580,
    desc:"Signal Transducer and Activator of Transcription 1. Binds HTT intron 5 — novel intragenic regulatory site. siRNA knockdown of STAT1 increases HTT expression. Negative regulator.",
    source:"PMC6294578 (Ansell-Schultz)" },

  // ── LAYER 1: DNA / Promoter ──
  { id:"HTT_PROM", label:"HTT\nPromoter",type:"dna",       layer:"dna",  x:250, y:300,
    desc:"HTT proximal promoter region (−1300 bp to TSS, chr4p16.3). Contains TATA-less promoter, GC-rich region, 20 bp tandem repeats with Sp1/HDBP sites, NF-κB motif, CpG island. 106 bp minimal promoter sufficient for basal expression.",
    source:"PMC6294578; PMC11546943" },

  // ── LAYER 2: mRNA + Processing ──
  { id:"HTT_mRNA", label:"HTT mRNA",     type:"mRNA",      layer:"mRNA", x:420, y:300,
    desc:"HTT transcript (NM_002111). 13,438 bp. Exon 1 contains CAG repeat in 5' region. 3'UTR contains binding sites for miR-137, miR-214, miR-148a, miR-199. Antisense transcript (HTT-AS) also expressed.",
    source:"PMC3759948; NCBI NM_002111" },
  { id:"HTT_AS",   label:"HTT-AS\n(antisense)", type:"ncRNA",layer:"mRNA", x:420, y:420,
    desc:"HTT antisense transcript. Negatively regulates HTT mRNA levels. Epigenetic mechanism of HTT expression modulation.",
    source:"PMC11546943" },

  // ── LAYER 3: Proteins ──
  { id:"wtHTT",    label:"wtHTT\n(≤35Q)",type:"protein_wt",layer:"protein", x:600, y:200,
    desc:"Wild-type huntingtin (≤35Q). 3,144 aa scaffolding protein. Functions: vesicle trafficking, REST sequestration in cytoplasm, BDNF support via transcription, anti-apoptotic, nuclear pore maintenance, HAP1 interaction.",
    source:"Cattaneo et al. 2005 Nat Rev Neurosci" },
  { id:"mHTT",     label:"mHTT\n(≥40Q)", type:"protein_mut",layer:"protein", x:600, y:400,
    desc:"Mutant huntingtin (≥40Q). PolyQ expansion causes: misfolding, nuclear/cytoplasmic aggregate formation, toxic sequestration of Sp1/CBP/TBP/p53, loss of normal HTT functions. Proteolytic cleavage produces toxic N-terminal fragments.",
    source:"Bates et al. 2015 Nat Rev Dis Primers; PMC6320389" },

  // ── LAYER 4: Effectors & Regulators ──
  // TF targets of wtHTT
  { id:"REST",     label:"REST/NRSF",   type:"repressor",  layer:"effector", x:820, y:80,
    desc:"Repressor Element-1 Silencing TF. In healthy: sequestered by wtHTT in cytoplasm → BDNF ON. In HD: Sp1 activates REST promoter + mHTT cannot sequester REST → REST enters nucleus → represses 2000+ NRSE-containing neuronal genes.",
    source:"Zuccato 2003 Nat Genet; PMC3001865" },
  { id:"CBP",      label:"CBP\n(KAT3A)",type:"coactivator",layer:"effector", x:820, y:200,
    desc:"CREB-Binding Protein / KAT3A. Histone acetyltransferase — adds acetyl to H3K27. CREB co-activator. In HD: mHTT polyQ co-aggregates with CBP native polyQ → loss of HAT activity → neuroprotective gene silencing.",
    source:"Steffan 2000 PNAS; PMC3805871; PMC3722569" },
  { id:"p300",     label:"p300\n(KAT3B)",type:"coactivator",layer:"effector", x:820, y:290,
    desc:"E1A-associated protein p300 / KAT3B. CBP homologue with HAT activity. Also sequestered by mHTT via polyQ-polyQ interaction. Required for memory and long-term potentiation.",
    source:"PMC3805871; PMC3722569" },
  { id:"PCAF",     label:"PCAF\n(KAT2B)",type:"coactivator",layer:"effector", x:820, y:380,
    desc:"p300/CBP-Associated Factor. HAT enzyme. mHTT inhibits PCAF HAT activity → disrupts P/CAF-dependent transcription factor targets.",
    source:"NBK55992 (NCBI Bookshelf)" },
  { id:"TBP",      label:"TBP\n(38Q)",  type:"basal_tx",  layer:"effector", x:820, y:470,
    desc:"TATA-Binding Protein. Contains native 38Q polyQ tract. Co-aggregates with mHTT expanded polyQ → TFIID complex disruption → genome-wide basal transcription impairment.",
    source:"Nucifora 2001 Science; PMC4082751" },
  { id:"TAFII130", label:"TAF4/\nTAFII130",type:"basal_tx",layer:"effector", x:820, y:555,
    desc:"TBP-Associated Factor 4 (TAFII130). Component of TFIID complex. Directly interacts with mHTT. Also interacts with CREB. Sequestration disrupts CREB-dependent transcription.",
    source:"PMC4082751; Dunah 2002 Science" },
  { id:"p53",      label:"p53",          type:"tf_stress", layer:"effector", x:820, y:640,
    desc:"Tumor suppressor p53. mHTT binds p53 and upregulates nuclear p53 levels and transcriptional activity. p53 activates pro-apoptotic genes (Bax, PUMA). Also negatively feeds back to regulate PGC-1α.",
    source:"PMC6433789; PMC2757461" },

  // Downstream of REST
  { id:"BDNF",     label:"BDNF",         type:"neurotrophin",layer:"effector", x:1040, y:80,
    desc:"Brain-Derived Neurotrophic Factor (chr11p14.1). Promoter II contains NRSE — silenced when REST enters nucleus. Critical for MSN survival via TrkB→MAPK/PI3K→CREB loop. miR-124 injection restores BDNF in HD mice.",
    source:"Zuccato & Cattaneo 2007 Nat Rev Neurosci; PMC9520620" },

  // Downstream of CBP/p300 — CREB axis
  { id:"CREB",     label:"CREB",         type:"tf_pos",    layer:"effector", x:1040, y:245,
    desc:"cAMP Response Element Binding Protein. Requires CBP/p300 as co-activator (phospho-Ser133 → recruits CBP). In HD: CBP sequestered → CREB target genes silenced. Downstream genes: ATF-3, STAT3, BDNF, PGC-1α.",
    source:"PMC20234532; PMC3805871" },

  // PGC-1α axis
  { id:"PGC1A",    label:"PGC-1α",       type:"coactivator",layer:"effector", x:1040, y:380,
    desc:"Peroxisome proliferator-activated receptor-gamma coactivator 1α. Master regulator of mitochondrial biogenesis, oxidative metabolism. mHTT represses PGC-1α via CREB/CBP sequestration AND direct interaction. Low PGC-1α → ROS↑ → MSN death.",
    source:"PMC2757461; PMC6433789" },
  { id:"SIRT1",    label:"SIRT1",        type:"enzyme",    layer:"effector", x:1040, y:470,
    desc:"Sirtuin 1 deacetylase. Activates PGC-1α by deacetylation. SIRT1 activation is therapeutic target in HD — would restore mitochondrial function.",
    source:"PMC2757461" },

  // HSF1 stress
  { id:"HSF1",     label:"HSF1",         type:"tf_stress", layer:"effector", x:1040, y:560,
    desc:"Heat Shock Factor 1. Stress-responsive TF. Activates chaperone expression (HSP70/HSP90). In HD: overwhelmed by mHTT misfolding load. HSF1 also regulates PGC-1α and p53 levels. Triple nexus of mitochondrial dysfunction.",
    source:"PMC6433789" },

  // Mitochondria
  { id:"MITO",     label:"Mitochondria\nDysfunction", type:"organelle", layer:"effector", x:1040, y:650,
    desc:"Mitochondrial dysfunction in HD: mHTT binds outer mitochondrial membrane → impairs protein import. mHTT impairs DRP1 (fission GTPase) → fragmented mitochondria. PGC-1α ↓ → reduced biogenesis. ETC complex II/III impaired → ROS production.",
    source:"PMC2757461; biorxiv 2025" },

  // UPS/Autophagy
  { id:"UPS",      label:"UPS/\nProteasome",type:"degradation",layer:"effector", x:1040, y:740,
    desc:"Ubiquitin-Proteasome System. mHTT is ubiquitinated and targeted for proteasomal degradation but fails — overwhelms UPS capacity. Collapsed UPS → accumulation of other misfolded proteins → proteostasis crisis.",
    source:"PMC6320389; PMC10013475" },
  { id:"AUTOPHAGY",label:"Autophagy\n(mTOR/Beclin1)",type:"degradation",layer:"effector", x:820, y:740,
    desc:"Autophagic clearance pathway. mHTT inclusion bodies (IBs) sequester autophagy components. mHTT impairs autophagosomal transport. IBs can extend cell survival by sequestering soluble mHTT but eventually disrupt homeostasis.",
    source:"PMC6320389" },

  // miRNAs
  { id:"miR9",     label:"miR-9",        type:"miRNA",     layer:"miRNA",    x:420, y:680,
    desc:"miR-9 (REST target). Downregulated in HD striatum and cortex. REST silences miR-9 promoter in HD (NRSE site). Creates REST→miR-9 double-negative feedback. Regulates REST/COREST and TWIST1 expression.",
    source:"PMC8354140; bioRxiv 2024" },
  { id:"miR132",   label:"miR-132",      type:"miRNA",     layer:"miRNA",    x:420, y:760,
    desc:"miR-132. Significantly downregulated in HD. REST target — expressed when REST is absent. Overexpression in HD models improves behavioral phenotype. Targets acetylcholinesterase and p250GAP.",
    source:"PMC8354140" },
  { id:"miR214",   label:"miR-214",      type:"miRNA",     layer:"miRNA",    x:420, y:840,
    desc:"miR-214. Upregulated in HD striatal cells. Directly targets HTT 3'UTR (validated luciferase assay). Participates in FFL with TWIST1 and HTT regulation. Also regulates p53.",
    source:"PMC3759948; bioRxiv 2024; PMC9520620" },
  { id:"miR124",   label:"miR-124",      type:"miRNA",     layer:"miRNA",    x:250, y:760,
    desc:"miR-124. Downregulated in HD brain (R6/2 mice and HD patients). Injection into bilateral striata: upregulates BDNF and PGC-1α, downregulates SOX9. Restores behavioral phenotype in rotarod test.",
    source:"PMC9520620" },

  // Aberrant TFs upregulated (loss-of-function HTT)
  { id:"TWIST1",   label:"TWIST1",       type:"tf_aberrant",layer:"effector", x:600, y:760,
    desc:"TWIST1. Transcription factor substantially upregulated in both HD and HTT-KO cells (NSCs and MSN-like cells). Regulates developmental genes. Part of miR-214/miR-199 feed-forward loop with HTT.",
    source:"bioRxiv 2024.05.20 (Zuccato group)" },

  // Outputs / Phenotype
  { id:"NEURONAL_GENES", label:"Neuronal\nGenes (2000+)", type:"output_pos",layer:"output", x:1240, y:80,
    desc:"~2000 REST/NRSE-target neuronal genes including: BDNF, SYN1, CHRM4, SCN8A, HOMER1, DRD2. All silenced when REST enters nucleus in HD. This accounts for the 'transcriptional fingerprint' of HD striatum.",
    source:"Johnson 2008 J Neurosci" },
  { id:"NEUROPROT_GENES",label:"Neuroprotective\nCREB Targets", type:"output_pos",layer:"output", x:1240, y:290,
    desc:"CREB/CBP-dependent neuroprotective program: PGC-1α, NRF1, BDNF, survival kinase targets. Repressed by mHTT-CBP sequestration. ATF-3, STAT3 also downstream. Loss drives metabolic failure.",
    source:"PMC20234532; Chaturvedi 2012" },
  { id:"MITOCHON_GENES", label:"Mitochondrial\nBiogenesis Genes",type:"output_neg",layer:"output", x:1240, y:440,
    desc:"PGC-1α/PPARγ target genes: NRF1, TFAM, COX4, ATP synthase subunits, mitochondrial import machinery. Reduced in HD → fewer, dysfunctional mitochondria → energy deficit → striatal MSN death.",
    source:"PMC2757461; PMC6433789" },
  { id:"APOPTOSIS",      label:"Apoptosis\n(Bax/PUMA↑)", type:"output_neg",layer:"output", x:1240, y:600,
    desc:"Pro-apoptotic transcription: p53 activates Bax, PUMA, cytochrome c release. Combined with energy deficit and ROS from mitochondrial dysfunction. mHTT also directly interacts with mitochondria to trigger cytochrome c.",
    source:"PMC6433789; PMC2757461" },
  { id:"MSN_DEATH",      label:"MSN\nDeath",  type:"pathology", layer:"output", x:1440, y:380,
    desc:"Medium Spiny Neuron (MSN/GABAergic) death — primary pathology of HD striatum. Caused by convergent loss of BDNF, CREB targets, mitochondrial function, and direct mHTT toxicity. Caudate and putamen lose >50% MSNs in end-stage HD.",
    source:"Vonsattel & DiFiglia 1998; Han et al. 2010" },
];

// ── EDGE CATALOGUE ─────────────────────────────────────────────────────────────────────
// type: activate | repress | sequester | transcribe | translate | process | feedback | miRNA_reg
// state: both | healthy | disease
const EDGES = [
  // Upstream → HTT Promoter
  { from:"CTCF",    to:"HTT_PROM", type:"activate",  state:"both",    w:1.5, label:"loop/activate",    desc:"CTCF maintains chromatin accessibility at HTT locus via topological loop formation (PMC11546943)" },
  { from:"SP1",     to:"HTT_PROM", type:"activate",  state:"both",    w:2.2, label:"11 binding sites",  desc:"Primary driver of HTT expression. 20bp tandem repeats contain key Sp1 sites (-212 to -173)" },
  { from:"HDBP1",   to:"HTT_PROM", type:"activate",  state:"both",    w:1.2, label:"+",                 desc:"Shares Sp1 binding region in 20bp repeats. Positive regulator." },
  { from:"HDBP2",   to:"HTT_PROM", type:"activate",  state:"both",    w:1.2, label:"+",                 desc:"Co-occupies Sp1/HDBP1 binding region. Positive regulator." },
  { from:"NF_kB",  to:"HTT_PROM", type:"repress",   state:"both",    w:1.2, label:"repress",           desc:"NF-κB negative regulator site confirmed in promoter. HD-specific role TBD." },
  { from:"STAT1",   to:"HTT_PROM", type:"repress",   state:"both",    w:1.5, label:"intron5 repressor", desc:"STAT1 binds HTT intron 5 — ChIP-qPCR confirmed. siRNA knockdown → HTT increases." },

  // Promoter → mRNA
  { from:"HTT_PROM",to:"HTT_mRNA", type:"transcribe",state:"both",    w:2,   label:"transcription",     desc:"RNA Pol II transcription. CAG repeat in exon 1 translated to polyQ." },
  { from:"HTT_AS",  to:"HTT_mRNA", type:"repress",   state:"both",    w:1,   label:"antisense repress",  desc:"HTT antisense transcript negatively regulates HTT mRNA levels." },

  // miRNAs → HTT mRNA (3'UTR)
  { from:"miR214",  to:"HTT_mRNA", type:"miRNA_reg", state:"disease", w:1.5, label:"3'UTR target",      desc:"miR-214 directly targets HTT 3'UTR (luciferase validated). Upregulated in HD, may limit mHTT." },

  // mRNA → Protein
  { from:"HTT_mRNA",to:"wtHTT",   type:"translate",  state:"healthy", w:2.5, label:"≤35Q translation",  desc:"Normal polyQ expansion ≤35Q → properly folded wtHTT protein." },
  { from:"HTT_mRNA",to:"mHTT",    type:"translate",  state:"disease", w:2.5, label:"≥40Q translation",  desc:"Expanded CAG ≥40Q → misfolded mHTT. 40-55Q = adult onset, >70Q = juvenile HD." },

  // wtHTT healthy functions (NOT gate on REST)
  { from:"wtHTT",   to:"REST",    type:"sequester",  state:"healthy", w:2,   label:"cytoplasmic sequester", desc:"wtHTT physically sequesters REST/NRSF in cytoplasm → REST cannot enter nucleus → BDNF ON. Biochemical evidence: REST co-immunoprecipitates with wtHTT." },
  { from:"wtHTT",   to:"CBP",     type:"activate",   state:"healthy", w:1.5, label:"frees CBP",          desc:"wtHTT does not interfere with CBP. CBP free to acetylate histones and co-activate CREB targets." },
  { from:"wtHTT",   to:"UPS",     type:"activate",   state:"healthy", w:1.2, label:"normal clearance",   desc:"wtHTT assists ubiquitin-mediated protein clearance. Properly folded protein does not impair UPS." },

  // mHTT disease — NOR/AND gates (polyQ-polyQ sequestration)
  { from:"mHTT",    to:"SP1",     type:"sequester",  state:"disease", w:2,   label:"sequesters Sp1",    desc:"mHTT sequesters Sp1 → Sp1 partially unavailable for normal targets BUT aberrantly activates REST promoter (dual gain/loss of function)." },
  { from:"mHTT",    to:"CBP",     type:"sequester",  state:"disease", w:2.2, label:"polyQ-polyQ sequest.",desc:"mHTT expanded polyQ co-aggregates with CBP native polyQ tract → CBP lost from nucleus → H3K27ac markedly reduced → neuroprotective gene silencing." },
  { from:"mHTT",    to:"p300",    type:"sequester",  state:"disease", w:1.8, label:"sequesters p300",   desc:"p300 also targeted by mHTT polyQ. CBP+p300 double loss amplifies HAT dysfunction." },
  { from:"mHTT",    to:"PCAF",    type:"sequester",  state:"disease", w:1.5, label:"inhibits PCAF HAT", desc:"mHTT inhibits PCAF HAT activity. Disrupts P/CAF-dependent gene networks." },
  { from:"mHTT",    to:"TBP",     type:"sequester",  state:"disease", w:2,   label:"co-aggregates TBP", desc:"mHTT co-aggregates with TBP (native 38Q) → TFIID impaired → genome-wide basal transcription disruption." },
  { from:"mHTT",    to:"TAFII130",type:"sequester",  state:"disease", w:1.5, label:"sequesters TAF4",   desc:"mHTT directly interacts with TAFII130/TAF4, disrupting CREB-TAF interaction and TFIID assembly." },
  { from:"mHTT",    to:"p53",     type:"sequester",  state:"disease", w:1.8, label:"upregulates p53",   desc:"mHTT binds p53 → increases nuclear p53 levels AND transcriptional activity → pro-apoptotic program." },
  { from:"mHTT",    to:"MITO",    type:"repress",    state:"disease", w:1.8, label:"DRP1/import impair.",desc:"mHTT binds outer mitochondrial membrane → impairs protein import. Disrupts DRP1 (fission GTPase) → fragmented, dysfunctional mitochondria." },
  { from:"mHTT",    to:"UPS",     type:"repress",    state:"disease", w:2,   label:"overwhelms UPS",    desc:"mHTT overloads proteasomal capacity. Ubiquitinated mHTT fails degradation → UPS collapse → proteostasis crisis." },
  { from:"mHTT",    to:"AUTOPHAGY",type:"repress",   state:"disease", w:1.8, label:"impairs autophagy", desc:"mHTT IBs sequester autophagy components. mHTT impairs autophagosomal transport → reduced clearance." },
  { from:"mHTT",    to:"HSF1",    type:"repress",    state:"disease", w:1.5, label:"overwhelms HSF1",   desc:"mHTT misfolding overloads HSF1-dependent chaperone response. HSF1 becomes chronically activated → exhaustion." },

  // Sp1 in disease → REST upregulation (aberrant AND gate)
  { from:"SP1",     to:"REST",    type:"activate",   state:"disease", w:2,   label:"aberrant REST activ.",desc:"Sp1 aberrantly activates REST promoter in HD (Sp1 binding sites in REST promoter). Sp3 normally represses this — ratio shifts in HD → REST mRNA increases." },

  // REST → BDNF (NOR gate: nuclear REST is OFF switch for BDNF)
  { from:"REST",    to:"BDNF",    type:"repress",    state:"disease", w:2,   label:"NRSE silencer",      desc:"Nuclear REST binds NRSE in BDNF promoter II → BDNF OFF. ~2000 neuronal genes silenced via NRSE. In healthy neurons: REST cytoplasmic → BDNF ON." },
  { from:"REST",    to:"NEURONAL_GENES",type:"repress",state:"disease",w:2.5,label:"NRSE silences 2000+",desc:"REST/NRSF represses NRSE-containing neuronal genes: SYN1, CHRM4, SCN8A, HOMER1, DRD2, GRIN2B, GABRA1." },
  { from:"REST",    to:"miR9",    type:"repress",    state:"disease", w:1.5, label:"represses miR-9",    desc:"REST represses miR-9 (NRSE in miR-9 promoter). In HD: REST in nucleus → miR-9 ↓." },
  { from:"REST",    to:"miR132",  type:"repress",    state:"disease", w:1.5, label:"represses miR-132",  desc:"REST target gene. miR-132 downregulated in HD striatum through REST-mediated repression." },

  // miR-9 negative feedback
  { from:"miR9",    to:"REST",    type:"repress",    state:"both",    w:1.2, label:"miR-9 → REST",      desc:"miR-9 targets REST/COREST complex. Negative feedback: REST↑ → miR-9↓ removes brake → REST further ↑ in HD." },
  { from:"miR9",    to:"TWIST1",  type:"repress",    state:"both",    w:1,   label:"miR-9→TWIST1",      desc:"miR-9 targets TWIST1. In HD: miR-9↓ → TWIST1↑. Part of FFL with HTT." },

  // miR-124 effects
  { from:"miR124",  to:"BDNF",   type:"activate",   state:"healthy", w:1.2, label:"indirect BDNF↑",    desc:"miR-124 injection in HD mice upregulates BDNF (indirect via SOX9 downregulation and pathway activation)." },
  { from:"miR124",  to:"PGC1A",  type:"activate",   state:"healthy", w:1.2, label:"indirect PGC-1α↑",  desc:"miR-124 injection upregulates PGC-1α in HD mouse striatum (PMC9520620)." },

  // CBP/p300 → CREB → neuroprotection
  { from:"CBP",     to:"CREB",   type:"activate",   state:"both",    w:2,   label:"HAT+coactivate",    desc:"CBP is CREB co-activator (binds phospho-Ser133 CREB) AND histone acetyltransferase. Free CBP → CREB targets ON." },
  { from:"p300",    to:"CREB",   type:"activate",   state:"both",    w:1.5, label:"coactivate",        desc:"p300 co-activates CREB target genes. Required for long-term memory consolidation." },
  { from:"CREB",    to:"NEUROPROT_GENES",type:"activate",state:"healthy",w:2.5,label:"CRE targets ON", desc:"CREB activates neuroprotective program: PGC-1α, BDNF, NRF1, ATF-3, STAT3, survival factors." },
  { from:"CREB",    to:"PGC1A",  type:"activate",   state:"both",    w:1.8, label:"CREB→PGC-1α",      desc:"CREB directly activates PGC-1α promoter. In HD: CBP sequestered → CREB cannot activate PGC-1α." },

  // PGC-1α / SIRT1 axis
  { from:"PGC1A",   to:"MITOCHON_GENES",type:"activate",state:"healthy",w:2.5,label:"biogenesis ON",   desc:"PGC-1α co-activates NRF1, PPARγ, ERRα → mitochondrial biogenesis genes: TFAM, COX4, ATP synthase." },
  { from:"SIRT1",   to:"PGC1A",  type:"activate",   state:"both",    w:1.5, label:"deacetylates PGC-1α",desc:"SIRT1 deacetylates and activates PGC-1α. AMPK/SIRT1/PGC-1α axis orchestrates mitochondrial function." },
  { from:"PGC1A",   to:"MSN_DEATH",type:"repress",  state:"healthy", w:1.5, label:"protective",       desc:"Adequate PGC-1α → mitochondrial health → MSN survival." },

  // p53 → apoptosis
  { from:"p53",     to:"APOPTOSIS",type:"activate",  state:"disease", w:2,   label:"Bax/PUMA↑",        desc:"Nuclear p53 activates Bax, PUMA → cytochrome c release → caspase cascade → apoptosis." },
  { from:"p53",     to:"PGC1A",   type:"repress",    state:"disease", w:1.2, label:"p53⊣PGC-1α",       desc:"p53 can negatively regulate PGC-1α under chronic activation — worsens mitochondrial dysfunction." },

  // TBP/TAFII → basal TX
  { from:"TBP",     to:"HTT_PROM",type:"activate",   state:"healthy", w:1.2, label:"TFIID basal TX",   desc:"Free TBP assembles TFIID for basal transcription at HTT promoter and genome-wide." },

  // HSF1
  { from:"HSF1",    to:"UPS",     type:"activate",   state:"healthy", w:1,   label:"chaperones assist", desc:"HSF1 activates HSP70/90 chaperones that assist UPS-mediated mHTT clearance." },
  { from:"HSF1",    to:"PGC1A",   type:"activate",   state:"both",    w:1.2, label:"HSF1→PGC-1α",      desc:"HSF1 regulates PGC-1α in mitochondrial dysfunction context. Proposed unifying mechanism (PMC6433789)." },

  // BDNF feedback
  { from:"BDNF",    to:"SP1",     type:"activate",   state:"healthy", w:1.5, label:"TrkB→SP1 feedback", desc:"BDNF/TrkB→MAPK/ERK→Sp1 activation. Positive feedback sustaining HTT expression circuit." },
  { from:"BDNF",    to:"CREB",    type:"activate",   state:"healthy", w:1.5, label:"TrkB→CREB",        desc:"BDNF/TrkB→PI3K/MAPK→CREB phosphorylation. Closes BDNF→CREB→PGC-1α neuroprotective loop." },
  { from:"BDNF",    to:"NEURONAL_GENES",type:"activate",state:"healthy",w:1.2,label:"TrkB→gene program",desc:"BDNF/TrkB signaling upregulates neuronal gene expression program through CREB and other TFs." },

  // Mitochondria / UPS → death
  { from:"MITO",    to:"MSN_DEATH",type:"activate",  state:"disease", w:2,   label:"energy failure→death",desc:"ETC complex impairment → ATP deficit → ROS → cytochrome c → apoptosis cascade." },
  { from:"APOPTOSIS",to:"MSN_DEATH",type:"activate", state:"disease", w:2.2, label:"apoptosis cascade",  desc:"p53-mediated Bax/PUMA activation → cytochrome c → caspase-3/7 → MSN death." },
  { from:"NEURONAL_GENES",to:"MSN_DEATH",type:"repress",state:"healthy",w:1.5,label:"neuronal survival", desc:"Adequate neuronal gene expression (BDNF, DRD2, SYN1, GRIN2B) maintains MSN viability." },
  { from:"NEUROPROT_GENES",to:"MSN_DEATH",type:"repress",state:"healthy",w:1.5,label:"neuroprotection", desc:"CREB target neuroprotective genes maintain MSN survival — lost in HD." },
  { from:"UPS",     to:"MSN_DEATH",type:"activate",  state:"disease", w:1.8, label:"proteostasis fail→death",desc:"UPS collapse → accumulation of multiple misfolded proteins → proteotoxicity → cell death." },
  { from:"AUTOPHAGY",to:"MSN_DEATH",type:"activate", state:"disease", w:1.5, label:"autophagy fail",     desc:"Failed autophagy clearance → inclusion body-mediated toxicity → gradual MSN death." },

  // TWIST1 → HTT FFL
  { from:"TWIST1",  to:"HTT_PROM",type:"repress",   state:"disease", w:1.2, label:"TW1→HTT repress",   desc:"TWIST1 (upregulated in HD/HTT-KO) may negatively regulate HTT — FFL with miR-214 (bioRxiv 2024)." },
];

// ── NODE VISUAL STYLES ──────────────────────────────────────────────────────────────────
const TYPE_STYLE = {
  tf_pos:      { fill:"#060e1a", stroke:"#00d4ff", label:"#00d4ff", shape:"diamond" },
  tf_neg:      { fill:"#150608", stroke:"#e05c5c", label:"#e05c5c", shape:"diamond" },
  tf_stress:   { fill:"#140a00", stroke:"#f0c040", label:"#f0c040", shape:"diamond" },
  tf_aberrant: { fill:"#12001a", stroke:"#d070ff", label:"#d070ff", shape:"diamond" },
  dna:         { fill:"#040c18", stroke:"#00bfff", label:"#00bfff", shape:"rect" },
  mRNA:        { fill:"#041408", stroke:"#00e5a0", label:"#00e5a0", shape:"rect" },
  ncRNA:       { fill:"#041408", stroke:"#40c880", label:"#40c880", shape:"rect" },
  protein_wt:  { fill:"#041408", stroke:"#1dcc88", label:"#1dcc88", shape:"circle" },
  protein_mut: { fill:"#180406", stroke:"#ff3060", label:"#ff3060", shape:"circle" },
  repressor:   { fill:"#150608", stroke:"#ff6644", label:"#ff6644", shape:"hexagon" },
  coactivator: { fill:"#0a0818", stroke:"#b060ff", label:"#b060ff", shape:"hexagon" },
  basal_tx:    { fill:"#100c00", stroke:"#c0a020", label:"#c0a020", shape:"hexagon" },
  neurotrophin:{ fill:"#041408", stroke:"#40ff88", label:"#40ff88", shape:"star" },
  enzyme:      { fill:"#0a0818", stroke:"#a060ff", label:"#a060ff", shape:"hexagon" },
  organelle:   { fill:"#140800", stroke:"#ff8040", label:"#ff8040", shape:"rect" },
  degradation: { fill:"#100010", stroke:"#cc60cc", label:"#cc60cc", shape:"rect" },
  miRNA:       { fill:"#080c08", stroke:"#40d860", label:"#40d860", shape:"circle" },
  output_pos:  { fill:"#040c08", stroke:"#20cc60", label:"#20cc60", shape:"rect" },
  output_neg:  { fill:"#140406", stroke:"#ee4455", label:"#ee4455", shape:"rect" },
  pathology:   { fill:"#180204", stroke:"#ff1830", label:"#ff1830", shape:"rect" },
};

const EDGE_STYLE = {
  activate:    { stroke:"#00e5a0", dash:"none" },
  repress:     { stroke:"#ff3060", dash:"6,3" },
  sequester:   { stroke:"#b060ff", dash:"3,2" },
  transcribe:  { stroke:"#00bfff", dash:"none" },
  translate:   { stroke:"#1dcc88", dash:"none" },
  process:     { stroke:"#f0c040", dash:"4,2" },
  feedback:    { stroke:"#60b0ff", dash:"none" },
  miRNA_reg:   { stroke:"#40d860", dash:"8,4" },
};

// ── LAYOUT ─────────────────────────────────────────────────────────────────────────────
// Build coordinate lookup from NODES array
const NODE_MAP = {};
NODES.forEach(n => { NODE_MAP[n.id] = n; });

// Auto-layout positions (layers)
const LAYER_X = { upstream_reg:70, dna:240, mRNA:420, protein:620, effector:860, miRNA:420, output:1120, pathology:1340 };
const LAYER_Y_STEP = { upstream_reg:90, dna:50, mRNA:80, protein:120, effector:85, miRNA:80, output:120 };

// ── SPARKLINE ──────────────────────────────────────────────────────────────────────────
function Sparkline({ data, color, w=120, h=32 }) {
  if (!data || data.length < 2) return <svg width={w} height={h}><line x1={0} y1={h/2} x2={w} y2={h/2} stroke={color} strokeWidth={1} opacity={0.3}/></svg>;
  const mx = Math.max(...data, 0.5);
  const pts = data.map((v,i)=>{ const x=(i/(data.length-1))*w; const y=h-2-(v/mx)*(h-4); return `${x},${y}`; }).join(" ");
  return <svg width={w} height={h} style={{display:"block"}}>
    <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} opacity={0.9}/>
    <line x1={0} y1={h-1} x2={w} y2={h-1} stroke={color} strokeWidth={0.5} opacity={0.2}/>
  </svg>;
}

// ── ODE SIMULATION ENGINE ──────────────────────────────────────────────────────────────
function useHTTSim(mode) {
  const stateRef = useRef({});
  const [history, setHistory] = useState({});
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(true);
  const timerRef = useRef(null);

  const getInitState = (m) => {
    const s = {};
    NODES.forEach(n => { s[n.id] = 0.1; });
    if (m === "healthy") {
      // Healthy steady-state starting values
      s.CTCF=5; s.SP1=6; s.SP3=3; s.HDBP1=3; s.HDBP2=3; s.NF_kB=1; s.STAT1=1;
      s.HTT_PROM=7; s.HTT_mRNA=6; s.HTT_AS=0.5; s.wtHTT=8; s.mHTT=0;
      s.REST=0.3; s.CBP=5; s.p300=4; s.PCAF=4; s.TBP=5; s.TAFII130=4;
      s.p53=0.5; s.BDNF=7; s.CREB=6; s.PGC1A=7; s.SIRT1=5; s.HSF1=4;
      s.MITO=0.2; s.UPS=6; s.AUTOPHAGY=6;
      s.miR9=5; s.miR132=5; s.miR214=1; s.miR124=5;
      s.TWIST1=0.5;
      s.NEURONAL_GENES=8; s.NEUROPROT_GENES=8; s.MITOCHON_GENES=7;
      s.APOPTOSIS=0.2; s.MSN_DEATH=0.1;
    } else {
      s.CTCF=4; s.SP1=5; s.SP3=1; s.HDBP1=2; s.HDBP2=2; s.NF_kB=3; s.STAT1=4;
      s.HTT_PROM=4; s.HTT_mRNA=5; s.HTT_AS=1; s.wtHTT=0; s.mHTT=8;
      s.REST=7; s.CBP=1; s.p300=1; s.PCAF=1; s.TBP=1; s.TAFII130=1;
      s.p53=6; s.BDNF=1; s.CREB=1; s.PGC1A=1; s.SIRT1=3; s.HSF1=2;
      s.MITO=7; s.UPS=2; s.AUTOPHAGY=2;
      s.miR9=1; s.miR132=1; s.miR214=5; s.miR124=1;
      s.TWIST1=6;
      s.NEURONAL_GENES=1; s.NEUROPROT_GENES=1; s.MITOCHON_GENES=1;
      s.APOPTOSIS=7; s.MSN_DEATH=8;
    }
    return s;
  };

  const reset = useCallback((m) => {
    stateRef.current = getInitState(m);
    setHistory({});
    setTick(0);
  }, []);

  useEffect(() => { reset(mode); }, [mode]);

  useEffect(() => {
    if (!running) { clearInterval(timerRef.current); return; }
    const DT = 0.04;
    const step = () => {
      const s = stateRef.current;
      const d = mode === "disease";
      const ds = {};

      const ha2=(x,K=1)=>ha(x,K,2), hr2=(x,K=1)=>hr(x,K,2);

      // Each node's ODE
      const eq = (id, drive, delta=0.35) => { ds[id] = (drive - delta*(s[id]??0))*DT; };

      // Upstream TFs — slowly varying inputs (add small drift to steady state)
      eq("CTCF",    5 + 0.5*Math.sin(tick*0.01));
      eq("SP1",     d ? (4*hr2(s.mHTT,4)) : 7,    0.2);
      eq("SP3",     d ? 1 : 4,  0.2);
      eq("HDBP1",   3.5); eq("HDBP2", 3.5);
      eq("NF_kB",   d ? 4 : 1.5);
      eq("STAT1",   d ? 5 : 1.5);

      // HTT promoter: AND-like integration
      const htPromDrive = 8 * ha2(s.SP1,3)*ha2(s.CTCF,3) * hr2(s.NF_kB,4) * hr2(s.STAT1,4)
                        * hr2(s.TWIST1,5) * hr2(s.HTT_AS,3);
      eq("HTT_PROM", htPromDrive, 0.3);

      // mRNA
      const htmDrive = 8 * ha2(s.HTT_PROM,4);
      eq("HTT_mRNA", htmDrive * hr2(s.miR214,3), 0.25);
      eq("HTT_AS",   1 + (d ? 1 : 0), 0.2);

      // Proteins
      eq("wtHTT",  d ? 0 : 7*ha2(s.HTT_mRNA,3), 0.2);
      eq("mHTT",   d ? 8*ha2(s.HTT_mRNA,3) : 0, 0.15);

      // REST: NOR gate — repressed by wtHTT, activated by Sp1 in disease
      const restDrive = d
        ? (6*ha2(s.SP1,3)*hr2(s.SP3,3))
        : (0.5*hr2(s.wtHTT,4));
      eq("REST", restDrive, 0.3);

      // CBP: free in healthy, sequestered in disease (NOT gate on mHTT)
      eq("CBP",     8*hr2(s.mHTT,5), 0.25);
      eq("p300",    8*hr2(s.mHTT,5), 0.25);
      eq("PCAF",    8*hr2(s.mHTT,4), 0.25);
      // TBP: co-aggregates with mHTT
      eq("TBP",     7*hr2(s.mHTT,5), 0.25);
      eq("TAFII130",7*hr2(s.mHTT,5), 0.25);
      // p53: elevated by mHTT
      eq("p53",     0.5 + 6*ha2(s.mHTT,4), 0.3);

      // BDNF: repressed by nuclear REST (NOR gate)
      const bdnfDrive = 8*hr2(s.REST,3)*ha2(s.CREB,4) + 1*ha2(s.miR124,4);
      eq("BDNF", bdnfDrive, 0.25);

      // CREB: requires free CBP, activated by BDNF
      const crebDrive = 6*ha2(s.CBP,3)*ha2(s.p300,3)*(1+0.5*ha2(s.BDNF,4));
      eq("CREB", crebDrive * hr2(s.TAFII130,3), 0.3);

      // PGC-1α: CREB-dependent, SIRT1-activated, p53-repressed, mHTT-repressed
      const pgcDrive = 6*ha2(s.CREB,4)*ha2(s.SIRT1,3)*hr2(s.p53,5)*hr2(s.mHTT,5);
      eq("PGC1A", pgcDrive, 0.25);

      eq("SIRT1", 5*hr2(s.mHTT,6), 0.2);
      eq("HSF1",  d ? (2*hr2(s.mHTT,8)) : 5, 0.2);

      // Mitochondria dysfunction
      eq("MITO",    d ? (7*ha2(s.mHTT,3)*hr2(s.PGC1A,4)) : 0.3, 0.2);

      // UPS
      eq("UPS",     d ? (2*hr2(s.mHTT,4)) : 6, 0.2);
      eq("AUTOPHAGY",d ? (2*hr2(s.mHTT,5)) : 6, 0.2);

      // miRNAs
      eq("miR9",    d ? (1*hr2(s.REST,3)) : 5, 0.2);
      eq("miR132",  d ? (1*hr2(s.REST,3)) : 5, 0.2);
      eq("miR214",  d ? (5*ha2(s.mHTT,4)) : 1, 0.2);
      eq("miR124",  d ? (1) : 5, 0.2);

      // TWIST1: upregulated by loss of HTT function + miR-9 downregulation
      eq("TWIST1",  d ? (6*hr2(s.miR9,3)) : 0.5, 0.25);

      // Outputs
      eq("NEURONAL_GENES",  8*hr2(s.REST,3)*ha2(s.BDNF,4), 0.2);
      eq("NEUROPROT_GENES", 8*ha2(s.CREB,3)*ha2(s.CBP,4), 0.2);
      eq("MITOCHON_GENES",  8*ha2(s.PGC1A,3), 0.2);
      eq("APOPTOSIS",       d ? (6*ha2(s.p53,3)*ha2(s.MITO,4)) : 0.2, 0.25);
      eq("MSN_DEATH",       d ? (5*ha2(s.APOPTOSIS,3)*hr2(s.NEUROPROT_GENES,4)*hr2(s.NEURONAL_GENES,5)) : 0.1, 0.15);

      const newS = {};
      Object.keys(s).forEach(k => { newS[k] = Math.max(0, Math.min(12, (s[k]??0)+(ds[k]??0))); });
      stateRef.current = newS;

      setHistory(prev => {
        const h = {...prev};
        Object.keys(newS).forEach(k => {
          if (!h[k]) h[k] = [];
          h[k] = [...h[k].slice(-250), newS[k]];
        });
        return h;
      });
      setTick(t=>t+1);
    };

    timerRef.current = setInterval(step, 50);
    return () => clearInterval(timerRef.current);
  }, [mode, running]);

  return { history, state: stateRef.current, running, setRunning, reset, tick };
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────────────
export default function HTTNetworkSim() {
  const [mode, setMode] = useState("healthy");
  const [selected, setSelected] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [showEdgeTypes, setShowEdgeTypes] = useState({ activate:true, repress:true, sequester:true, transcribe:true, translate:true, miRNA_reg:true, feedback:true });
  const [zoom, setZoom] = useState(0.72);
  const [pan, setPan] = useState({ x:0, y:0 });
  const svgRef = useRef(null);
  const isPanning = useRef(false);
  const lastPan = useRef({ x:0, y:0 });

  const { history, state, running, setRunning, reset, tick } = useHTTSim(mode);

  const selNode = selected ? NODE_MAP[selected] : null;
  const selStyle = selNode ? (TYPE_STYLE[selNode.type] || TYPE_STYLE.dna) : null;

  const activeEdges = EDGES.filter(e => {
    if (!showEdgeTypes[e.type]) return false;
    if (mode === "compare") return true;
    return e.state === "both" || e.state === mode;
  });

  // Derive active node IDs from visible edges
  const activeNodeIds = new Set(activeEdges.flatMap(e=>[e.from,e.to]));

  // SVG pan
  const onMouseDown = (e) => { if(e.target === svgRef.current || e.target.tagName==="rect") { isPanning.current=true; lastPan.current={x:e.clientX,y:e.clientY}; } };
  const onMouseMove = (e) => { if(!isPanning.current) return; setPan(p=>({x:p.x+(e.clientX-lastPan.current.x),y:p.y+(e.clientY-lastPan.current.y)})); lastPan.current={x:e.clientX,y:e.clientY}; };
  const onMouseUp = () => { isPanning.current=false; };

  const edgePath = (fromN, toN) => {
    if (!fromN || !toN) return "";
    const fx=fromN.x, fy=fromN.y, tx=toN.x, ty=toN.y;
    const dx=tx-fx, dy=ty-fy, len=Math.sqrt(dx*dx+dy*dy)||1;
    const mx=(fx+tx)/2, my=(fy+ty)/2;
    const curv = len*0.12;
    const nx=-dy/len*curv, ny=dx/len*curv;
    return `M${fx},${fy} Q${mx+nx},${my+ny} ${tx},${ty}`;
  };

  const getShape = (node) => {
    const s = TYPE_STYLE[node.type] || TYPE_STYLE.dna;
    const cx=node.x, cy=node.y;
    const val = Math.min(state[node.id]??0,12);
    const dimmed = selected && selected!==node.id && !activeEdges.some(e=>e.from===node.id||e.to===node.id||e.from===selected||e.to===selected);
    const sel = selected===node.id;
    const op = dimmed ? 0.2 : 1;
    const glow = val>6 ? `drop-shadow(0 0 5px ${s.stroke}aa)` : undefined;
    const baseProps = { fill:s.fill, stroke:s.stroke, strokeWidth: sel?2.2:1.2, opacity:op, style:{cursor:"pointer",filter:glow} };

    if (s.shape==="circle") return <circle cx={cx} cy={cy} r={32} {...baseProps}/>;
    if (s.shape==="diamond") return <polygon points={`${cx},${cy-28} ${cx+46},${cy} ${cx},${cy+28} ${cx-46},${cy}`} {...baseProps}/>;
    if (s.shape==="hexagon") {
      const R=28, pts=Array.from({length:6},(_,i)=>{ const a=(i*60-30)*Math.PI/180; return `${cx+R*Math.cos(a)},${cy+R*Math.sin(a)}`; }).join(" ");
      return <polygon points={pts} {...baseProps}/>;
    }
    if (s.shape==="star") {
      const pts=[]; for(let i=0;i<10;i++){const r=i%2===0?30:15,a=(i*36-90)*Math.PI/180;pts.push(`${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`);}
      return <polygon points={pts.join(" ")} {...baseProps}/>;
    }
    const W = node.id.length>12?120:node.label.includes("\n")?96:84;
    const H = node.label.includes("\n")?50:38;
    return <rect x={cx-W/2} y={cy-H/2} width={W} height={H} rx={5} {...baseProps}/>;
  };

  // Count by layer for layout info
  const layerCounts = {};
  NODES.forEach(n=>{ layerCounts[n.layer]=(layerCounts[n.layer]||0)+1; });

  return (
    <div style={{
      fontFamily:"'IBM Plex Mono','Courier New',monospace",
      background:"#050810", color:"#c0d8f0",
      height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden",
    }}>

      {/* HEADER */}
      <div style={{ padding:"10px 16px 8px", borderBottom:"1px solid #142030", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.2em", color:"#1e3a5a" }}>
            HTT GENE REGULATORY NETWORK
          </div>
          <div style={{ fontSize:8, color:"#1e3a5a", marginTop:1, letterSpacing:"0.1em" }}>
            {NODES.length} nodes · {EDGES.length} edges · Hill ODE simulation · {mode==="healthy"?"HEALTHY STATE":"DISEASE STATE (mHTT ≥40Q)"}
          </div>
        </div>
        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          {[{id:"healthy",label:"● HEALTHY",c:"#1dcc88"},{id:"disease",label:"● DISEASE",c:"#ff3060"},{id:"compare",label:"◑ BOTH",c:"#f0c040"}].map(m=>(
            <button key={m.id} onClick={()=>{setMode(m.id);setSelected(null);}} style={{
              fontSize:9, padding:"4px 12px", borderRadius:3, cursor:"pointer", fontFamily:"monospace", fontWeight:700,
              border:`1px solid ${mode===m.id?m.c:"#1e3040"}`, background:mode===m.id?m.c+"18":"transparent",
              color:mode===m.id?m.c:"#2d4a60",
            }}>{m.label}</button>
          ))}
          <div style={{ width:1, height:20, background:"#1e3040", margin:"0 4px" }}/>
          <button onClick={()=>setRunning(r=>!r)} style={{ fontSize:9, padding:"4px 10px", borderRadius:3, cursor:"pointer", fontFamily:"monospace",
            border:`1px solid ${running?"#f0c040":"#1e3040"}`, background:running?"#f0c04014":"transparent", color:running?"#f0c040":"#2d4a60",
          }}>{running?"⏸":"▶"}</button>
          <button onClick={()=>reset(mode)} style={{ fontSize:9, padding:"4px 8px", borderRadius:3, cursor:"pointer", fontFamily:"monospace",
            border:"1px solid #1e3040", background:"transparent", color:"#2d4a60",
          }}>↺</button>
          <button onClick={()=>setZoom(z=>Math.max(0.3,z-0.1))} style={{ fontSize:9, padding:"4px 8px", borderRadius:3, cursor:"pointer", fontFamily:"monospace", border:"1px solid #1e3040", background:"transparent", color:"#2d4a60" }}>−</button>
          <span style={{ fontSize:9, color:"#2d4a60", minWidth:32, textAlign:"center" }}>{(zoom*100).toFixed(0)}%</span>
          <button onClick={()=>setZoom(z=>Math.min(2,z+0.1))} style={{ fontSize:9, padding:"4px 8px", borderRadius:3, cursor:"pointer", fontFamily:"monospace", border:"1px solid #1e3040", background:"transparent", color:"#2d4a60" }}>+</button>
        </div>
      </div>

      {/* EDGE TYPE FILTER */}
      <div style={{ padding:"5px 16px", borderBottom:"1px solid #0d1a28", display:"flex", gap:10, flexWrap:"wrap", background:"#040710" }}>
        {Object.entries({activate:"activation",repress:"repression",sequester:"sequestration",transcribe:"transcription",translate:"translation",miRNA_reg:"miRNA",feedback:"feedback"}).map(([k,v])=>(
          <label key={k} style={{ display:"flex", alignItems:"center", gap:4, cursor:"pointer", fontSize:8 }}>
            <input type="checkbox" checked={showEdgeTypes[k]||false} onChange={e=>setShowEdgeTypes(p=>({...p,[k]:e.target.checked}))} style={{ accentColor:EDGE_STYLE[k]?.stroke||"#888", width:10, height:10 }}/>
            <span style={{ color:showEdgeTypes[k]?(EDGE_STYLE[k]?.stroke||"#888"):"#2d4060" }}>
              {v}
            </span>
          </label>
        ))}
        <span style={{ marginLeft:"auto", fontSize:8, color:"#1e3040" }}>drag to pan · scroll to zoom</span>
      </div>

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ── SVG CANVAS ── */}
        <div style={{ flex:1, position:"relative", overflow:"hidden" }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onWheel={e=>{ e.preventDefault(); setZoom(z=>Math.max(0.3,Math.min(2,z-(e.deltaY>0?0.08:-0.08)))); }}
        >
          <svg ref={svgRef} style={{ width:"100%", height:"100%", display:"block", cursor:"grab" }}>
            <defs>
              <filter id="glow3"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <pattern id="bg" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="0.5" fill="#0a1828"/></pattern>
              {Object.entries(EDGE_STYLE).map(([type,style])=>(
                <marker key={type} id={`ar-${type}`} viewBox="0 -5 10 10" refX="18" refY="0" markerWidth="5" markerHeight="5" orient="auto">
                  {type==="repress"?<line x1="0" y1="-5" x2="0" y2="5" stroke={style.stroke} strokeWidth="2.5"/>
                   :type==="sequester"?<circle cx="5" cy="0" r="4" fill={style.stroke}/>
                   :<path d="M0,-5L10,0L0,5" fill={style.stroke}/>}
                </marker>
              ))}
            </defs>

            <rect width="100%" height="100%" fill="url(#bg)" onClick={()=>setSelected(null)}/>

            <g transform={`translate(${pan.x+16},${pan.y+16}) scale(${zoom})`}>
              {/* Layer labels */}
              {[
                {label:"UPSTREAM\nREGULATORS",x:70,color:"#0d2040"},
                {label:"HTT\nPROMOTER",x:240,color:"#0d2040"},
                {label:"mRNA &\nnon-coding",x:420,color:"#0d2040"},
                {label:"HTT\nPROTEIN",x:620,color:"#0d2040"},
                {label:"EFFECTORS &\nDOWNSTREAM",x:860,color:"#0d2040"},
                {label:"OUTPUTS",x:1120,color:"#0d2040"},
                {label:"PHENOTYPE",x:1340,color:"#0d2040"},
              ].map(l=>(
                <text key={l.label} x={l.x} y={18} textAnchor="middle" fontSize="7"
                  fill={l.color} fontFamily="monospace" letterSpacing="0.1em">
                  {l.label.split("\n").map((ln,i)=><tspan key={i} x={l.x} dy={i===0?0:9}>{ln}</tspan>)}
                </text>
              ))}

              {/* Vertical layer separators */}
              {[160,330,520,730,1000,1230].map(x=>(
                <line key={x} x1={x} y1={25} x2={x} y2={900} stroke="#0a1828" strokeWidth={1} strokeDasharray="4,4"/>
              ))}

              {/* ── EDGES ── */}
              {activeEdges.map((edge,i)=>{
                const fn=NODE_MAP[edge.from], tn=NODE_MAP[edge.to];
                if (!fn||!tn) return null;
                const es = EDGE_STYLE[edge.type]||EDGE_STYLE.activate;
                const isHov = hoveredEdge===edge;
                const selInvolved = selected && (edge.from===selected||edge.to===selected);
                const dimmed = selected && !selInvolved;
                const srcVal = Math.min(state[edge.from]??0,12);
                const intensity = srcVal/12;
                const color = mode==="compare"
                  ? (edge.state==="disease"?"#ff3060":edge.state==="healthy"?"#1dcc88":es.stroke)
                  : es.stroke;
                const path = edgePath(fn,tn);
                return (
                  <g key={`${edge.from}-${edge.to}-${i}`}>
                    <path d={path} fill="none" stroke="transparent" strokeWidth={14} style={{cursor:"pointer"}}
                      onMouseEnter={()=>setHoveredEdge(edge)} onMouseLeave={()=>setHoveredEdge(null)}/>
                    <path d={path} fill="none" stroke={color}
                      strokeWidth={isHov?2.5:(selInvolved?2:Math.max(0.8,1+intensity*1.5))}
                      strokeDasharray={es.dash==="none"?undefined:es.dash}
                      opacity={dimmed?0.05:isHov?1:(selInvolved?0.9:0.3+intensity*0.5)}
                      markerEnd={`url(#ar-${edge.type})`}
                      style={{pointerEvents:"none",transition:"opacity 0.12s"}}/>
                    {isHov&&(()=>{
                      const mx=(fn.x+tn.x)/2, my=(fn.y+tn.y)/2;
                      return <text x={mx} y={my-8} textAnchor="middle" fontSize="7.5" fill={color} fontFamily="monospace" style={{pointerEvents:"none"}}>{edge.label}</text>;
                    })()}
                  </g>
                );
              })}

              {/* ── NODES ── */}
              {NODES.map(node=>{
                const s = TYPE_STYLE[node.type]||TYPE_STYLE.dna;
                const val = Math.min(state[node.id]??0,12);
                const active = activeNodeIds.has(node.id) || mode==="compare";
                const dimmed = (!active && mode!=="compare") || (selected && selected!==node.id && !activeEdges.some(e=>(e.from===node.id||e.to===node.id)&&(e.from===selected||e.to===selected)));
                const lines = node.label.split("\n");
                const sel = selected===node.id;

                return (
                  <g key={node.id} onClick={()=>setSelected(p=>p===node.id?null:node.id)} style={{cursor:"pointer"}} opacity={dimmed?0.15:1}>
                    {sel&&<circle cx={node.x} cy={node.y} r={42} fill="none" stroke={s.stroke} strokeWidth={1} opacity={0.25} strokeDasharray="5,3"/>}
                    {getShape(node)}
                    {/* Expression fill ring */}
                    {s.shape==="circle"&&<circle cx={node.x} cy={node.y} r={32} fill="none" stroke={s.stroke} strokeWidth={2.5}
                      strokeDasharray={`${(val/12)*201} 201`} opacity={0.3} transform={`rotate(-90 ${node.x} ${node.y})`}
                      style={{pointerEvents:"none"}}/>}
                    {lines.map((line,i)=>(
                      <text key={i} x={node.x} y={node.y+(lines.length===1?0:i*12-6)+0.5}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={node.id.length>8?"7.5":"9"} fontWeight="700"
                        fill={s.label} fontFamily="monospace" style={{pointerEvents:"none"}}>
                        {line}
                      </text>
                    ))}
                    {/* Value pill */}
                    <rect x={node.x-14} y={node.y+(lines.length>1?30:22)} width={28} height={10} rx={5}
                      fill={s.stroke} opacity={0.18} style={{pointerEvents:"none"}}/>
                    <text x={node.x} y={node.y+(lines.length>1?30:22)+8}
                      textAnchor="middle" fontSize="6.5" fill={s.stroke} fontFamily="monospace"
                      style={{pointerEvents:"none"}}>{val.toFixed(1)}</text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ width:260, borderLeft:"1px solid #0d1a28", display:"flex", flexDirection:"column", overflow:"hidden", background:"#040710" }}>

          {/* SELECTED NODE */}
          {(selNode||hoveredEdge) && (
            <div style={{
              padding:"12px 14px", borderBottom:"1px solid #0d1a28",
              borderLeft:`2px solid ${selNode?selStyle?.stroke:"#60a0ff"}`,
              animation:"fadeIn 0.15s",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ fontSize:11, fontWeight:700, color:selNode?selStyle?.label:"#60a0ff", marginBottom:3 }}>
                  {selNode?selNode.label.replace("\n"," "):hoveredEdge?.label}
                </div>
                <button onClick={()=>{setSelected(null);setHoveredEdge(null);}} style={{ background:"transparent", border:"1px solid #1e3040", borderRadius:3, color:"#2d4a60", fontSize:9, padding:"2px 6px", cursor:"pointer" }}>✕</button>
              </div>
              {selNode && <div style={{ fontSize:7, color:"#2d4060", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>{selNode.type} · {selNode.layer}</div>}
              <div style={{ fontSize:9, color:"#6090b0", lineHeight:1.7, marginBottom:6 }}>
                {selNode?selNode.desc:hoveredEdge?.desc}
              </div>
              <div style={{ fontSize:7.5, color:"#1e3040", fontStyle:"italic", lineHeight:1.5 }}>
                {selNode?selNode.source:hoveredEdge?.source||""}
              </div>
              {selNode && (
                <div style={{ marginTop:8 }}>
                  <Sparkline data={history[selNode.id]} color={selStyle?.stroke||"#00e5a0"} w={230} h={36}/>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
                    <span style={{ fontSize:8, color:"#2d4060" }}>expression level</span>
                    <span style={{ fontSize:9, color:selStyle?.label, fontWeight:700 }}>{((state[selNode.id]??0)).toFixed(3)}</span>
                  </div>
                </div>
              )}
              {/* Adjacent edges */}
              {selNode && (
                <div style={{ marginTop:8 }}>
                  <div style={{ fontSize:7.5, color:"#1e3040", letterSpacing:"0.1em", marginBottom:4 }}>CONNECTIONS</div>
                  {activeEdges.filter(e=>e.from===selNode.id||e.to===selNode.id).slice(0,8).map((e,i)=>{
                    const es = EDGE_STYLE[e.type]||{stroke:"#888"};
                    return <div key={i} style={{ fontSize:7.5, color:"#3d5a70", padding:"2px 6px", marginBottom:2,
                      background:"#080d18", borderRadius:3, borderLeft:`2px solid ${es.stroke}`,
                    }}>{e.from} →{e.type==="repress"||e.type==="sequester"?"⊣":"→"} {e.to}</div>;
                  })}
                </div>
              )}
            </div>
          )}

          {/* KEY NODE TIMESERIES */}
          <div style={{ flex:1, overflow:"auto", padding:"10px 12px" }}>
            <div style={{ fontSize:7.5, color:"#1e3040", letterSpacing:"0.12em", marginBottom:8 }}>KEY NODE EXPRESSION</div>
            {[
              {id:"mHTT",     label:"mHTT (disease driver)"},
              {id:"wtHTT",    label:"wtHTT (healthy)"},
              {id:"REST",     label:"REST/NRSF (NRSE repressor)"},
              {id:"BDNF",     label:"BDNF (neurotrophin)"},
              {id:"CBP",      label:"CBP (HAT/coactivator)"},
              {id:"PGC1A",    label:"PGC-1α (mitochondria)"},
              {id:"p53",      label:"p53 (apoptosis TF)"},
              {id:"CREB",     label:"CREB (neuroprotection)"},
              {id:"MSN_DEATH",label:"MSN Death (pathology)"},
              {id:"miR9",     label:"miR-9 (REST feedback)"},
              {id:"miR214",   label:"miR-214 (HTT 3'UTR)"},
              {id:"NEURONAL_GENES",label:"Neuronal genes"},
              {id:"MITO",     label:"Mitochondria dysfunc."},
              {id:"UPS",      label:"UPS/Proteasome"},
            ].map(({id,label})=>{
              const n = NODE_MAP[id]; if(!n) return null;
              const s = TYPE_STYLE[n.type]||TYPE_STYLE.dna;
              const val = Math.min(state[id]??0,12);
              return (
                <div key={id} onClick={()=>setSelected(p=>p===id?null:id)} style={{ marginBottom:8, cursor:"pointer",
                  padding:"4px 6px", borderRadius:4,
                  background:selected===id?s.fill:"transparent",
                  border:`1px solid ${selected===id?s.stroke:"transparent"}`,
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                    <span style={{ fontSize:7.5, color:s.label, fontWeight:"700" }}>{label}</span>
                    <span style={{ fontSize:8, color:val>6?"#00e5a0":val<2?"#e05c5c":"#f0c040" }}>{val.toFixed(1)}</span>
                  </div>
                  <Sparkline data={history[id]} color={s.stroke} w={230} h={18}/>
                </div>
              );
            })}
          </div>

          {/* LOGIC GATE SUMMARY */}
          <div style={{ padding:"10px 12px", borderTop:"1px solid #0d1a28" }}>
            <div style={{ fontSize:7.5, color:"#1e3040", letterSpacing:"0.1em", marginBottom:6 }}>LOGIC GATES IN CIRCUIT</div>
            {[
              {gate:"NOT",  color:"#e05c5c", desc:"Sp1→HTT_PROM: single activator"},
              {gate:"NOT",  color:"#e05c5c", desc:"REST repressor (NOT BDNF)"},
              {gate:"AND",  color:"#80c4ff", desc:"SP1∧CTCF→HTT promoter"},
              {gate:"AND",  color:"#80c4ff", desc:"CBP∧p300→CREB activation"},
              {gate:"NOR",  color:"#e880ff", desc:"mHTT sequesters CBP∨p300∨PCAF"},
              {gate:"NOR",  color:"#e880ff", desc:"REST∨mHTT represses BDNF (dual gate)"},
              {gate:"FFL",  color:"#80ffca", desc:"miR-9↔REST double-negative FFL"},
              {gate:"FFL",  color:"#80ffca", desc:"miR-214/TWIST1/HTT regulatory FFL"},
      ].map((g,i)=>(
              <div key={i} style={{ display:"flex", gap:6, alignItems:"center", marginBottom:4 }}>
                <div style={{ width:28, height:14, borderRadius:3, display:"flex", alignItems:"center", justifyContent:"center",
                  background:g.color+"22", border:`1px solid ${g.color}55`, flexShrink:0,
                }}>
                  <span style={{ fontSize:7, color:g.color, fontWeight:700 }}>{g.gate}</span>
                </div>
                <span style={{ fontSize:7.5, color:"#3d5a70" }}>{g.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LEGEND + CITATIONS */}
      <div style={{ padding:"6px 16px", borderTop:"1px solid #0d1a28", background:"#040710",
        display:"flex", gap:16, flexWrap:"wrap", alignItems:"center" }}>
        {Object.entries({activate:"▶ activation",repress:"⊣ repression",sequester:"● sequestration",transcribe:"→ transcription",translate:"→ translation",miRNA_reg:"~ miRNA",}).map(([k,v])=>{
          const es = EDGE_STYLE[k]; if(!es) return null;
          return <div key={k} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <svg width={22} height={8}><line x1={0} y1={4} x2={22} y2={4} stroke={es.stroke} strokeWidth={1.5} strokeDasharray={es.dash==="none"?undefined:es.dash}/></svg>
            <span style={{ fontSize:7.5, color:showEdgeTypes[k]?es.stroke:"#1e3040" }}>{v}</span>
          </div>;
        })}
        <div style={{ marginLeft:"auto", fontSize:7, color:"#0f1e30", lineHeight:1.5, textAlign:"right" }}>
          Sources: Zuccato 2003 · Li 2012 · PMC6294578 · PMC11546943 · PMC3805871 · PMC2757461 · PMC6433789 · PMC6320389 · PMC8354140 · bioRxiv 2024
        </div>
      </div>
    </div>
  );
}