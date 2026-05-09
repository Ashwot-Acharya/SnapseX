import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'

import GeneticCircuit from './GeneticCircuit'
import GRNSimulator from './GRNSimulator'

// ─────────────────────────────────────────────────────────────────────────────
// BIOLOGICAL MODEL — Sources:
//   Goold et al. 2021 Cell Reports    — FAN1 sequesters MLH1 from MSH3 (SPYF motif)
//   Wang et al. 2024 Cell             — MSH3/PMS1 set neuronal CAG rate (+8.8/month MSN)
//   GeM-HD Consortium 2019 Nat Genet  — GWAS: FAN1 most significant locus
//   Loupe et al. 2020 Nat Genet       — somatic CAG drives onset, not germline
//   Swami et al. 2009 Hum Mol Genet   — human striatal ~1–3 CAG/year
//
// THE KEY MECHANISM YOUR ORIGINAL CODE MISSED:
//   FAN1, MSH3, and EXO1 all COMPETE for the same S2 site on MLH1's CTD.
//   FAN1 wins (higher affinity via dual MIP+MIM motifs) → MLH1 sequestered
//   → MutSβ·MLH1 complex CANNOT form → expansion blocked.
//   MSH3 wins → MutSβ·MLH1 assembled → expansion DRIVEN.
//   MLH1 KO → neither forms → expansion abolished (confirmed mouse KO data).
// ─────────────────────────────────────────────────────────────────────────────

const GENE_META = {
  MSH3: {
    fullName: 'MutS Homolog 3', chr: '5q14.1',
    role: 'MMR complex driver',
    color: '#e83060',
    direction: 'pro_expansion',
    mechanism: 'Forms MutSβ (MSH2+MSH3). Binds MLH1 S2 site → assembles expansion-driving complex. Knockout reduces striatal expansion 29× (Wang 2024).',
    gwas: 'rs557874766 Pro67Ala — accelerates somatic expansion → earlier HD motor onset',
  },
  FAN1: {
    fullName: 'FANCD2/FANCI-Associated Nuclease 1', chr: '15q13.3',
    role: 'MLH1 sequestration + nuclease',
    color: '#00e5a0',
    direction: 'anti_expansion',
    mechanism: 'SPYF motif binds MLH1 S2 site (COMPETITIVE with MSH3). Also degrades slipped-loop intermediates via nuclease. Two independent suppression mechanisms.',
    gwas: 'p.R507H loss-of-function — reduces MLH1 sequestration → earlier onset ~6 yrs (GeM-HD 2019)',
  },
  MLH1: {
    fullName: 'MutL Homolog 1', chr: '3p22.2',
    role: 'Central contested scaffold',
    color: '#f0c040',
    direction: 'conditional',
    mechanism: 'CTD S2 site is the molecular battleground. FAN1 bound = expansion suppressed. MSH3 bound = expansion driven. MLH1 KO = expansion abolished in mice.',
    gwas: 'Variants modulate S2-site binding competition equilibrium. MLH1 KO ablates all somatic expansion.',
  },
}

// Genotype options
const GENOTYPE_OPTS = [
  { value: 'normal',   label: 'WT',    desc: '2 normal copies',   levelFactor: 1.0 },
  { value: 'het',      label: 'het',   desc: '1 mutant copy',     levelFactor: 0.5 },
  { value: 'knockout', label: 'KO/LOF',desc: 'loss of function',  levelFactor: 0.0 },
]

// ─── COMPETITIVE BINDING MODEL ───────────────────────────────────────────────
function computeNetExpansionRate(germlineCAG, genotypes) {
  const msh3 = { normal: 1.0, het: 0.5, knockout: 0.0 }[genotypes.MSH3]
  const fan1  = { normal: 1.0, het: 0.5, knockout: 0.0 }[genotypes.FAN1]
  const mlh1  = { normal: 1.0, het: 0.5, knockout: 0.0 }[genotypes.MLH1]

  // MLH1 KO → no MMR complex → expansion near zero (Wang 2024, Mlh1-KO mice)
  if (mlh1 === 0) {
    return { rate: 0.04, fan1Pct: 0, msh3Pct: 0, freePct: 100, mmrActivity: 0 }
  }

  // Competitive binding to MLH1 S2 site
  // Kd values normalised: FAN1 has ~3× higher affinity (dual MIP+MIM vs single MIP)
  const Kd_fan1 = 0.33
  const Kd_msh3 = 1.00
  const denom = 1 + (fan1 / Kd_fan1) + (msh3 / Kd_msh3)
  const fan1Occ = (fan1 / Kd_fan1) / denom   // fraction MLH1 bound by FAN1
  const msh3Occ = (msh3 / Kd_msh3) / denom   // fraction MLH1 bound by MSH3
  const freeOcc = 1 - fan1Occ - msh3Occ

  // Effective MMR complex = MSH3·MLH1, scaled by MLH1 availability
  const mmrComplex = msh3Occ * mlh1

  // Base human striatal expansion rate ~1.5 CAG/year at 40Q (Swami 2009)
  // Scales with CAG length — longer repeats slip more readily
  const cagFactor = Math.max(0.5, 1 + 0.045 * (germlineCAG - 40))
  const baseRate = 1.5 * cagFactor

  // MMR-driven component (proportional to active MutSβ·MLH1 complex)
  const mmrDriven = baseRate * mmrComplex * 2.4

  // FAN1 nuclease suppression (independent of MLH1 binding — second mechanism)
  // Even FAN1 not bound to MLH1 degrades slipped loops
  const nucleaseFactor = 1 - 0.38 * fan1

  const netRate = Math.max(0.04, mmrDriven * nucleaseFactor)

  return {
    rate: parseFloat(netRate.toFixed(3)),
    fan1Pct: parseFloat((fan1Occ * 100).toFixed(1)),
    msh3Pct: parseFloat((msh3Occ * 100).toFixed(1)),
    freePct: parseFloat((freeOcc * 100).toFixed(1)),
    mmrActivity: parseFloat((mmrComplex * 100).toFixed(1)),
  }
}

const TISSUE_MULT = { striatum: 1.0, cortex: 0.55, liver: 0.40, blood: 0.08 }

function runSimulation(germlineCAG, genotypes, tissue, years = 40) {
  const mult = TISSUE_MULT[tissue]
  const model = computeNetExpansionRate(germlineCAG, genotypes)
  const rate = model.rate * mult

  let cag = germlineCAG
  const data = []
  for (let y = 0; y <= years; y++) {
    if (y > 0) {
      const noise = (Math.random() - 0.48) * rate * 0.5
      cag = Math.min(200, Math.max(germlineCAG, cag + rate + noise))
    }
    data.push({ year: y, cag: parseFloat(cag.toFixed(1)) })
  }

  // Langbehn onset estimate adjusted for somatic expansion
  let onset = null
  if (germlineCAG >= 40) {
    const langbehn = 21.54 + Math.exp(9.556 - 0.146 * germlineCAG)
    // Somatic: years to reach 2.5× germline CAG in striatum
    const target = germlineCAG * 2.5
    const yearsToTarget = rate > 0.1 ? (target - germlineCAG) / rate : 999
    onset = Math.min(langbehn, Math.max(18, yearsToTarget)).toFixed(1)
  }

  return { data, model, onset, rate }
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const cag = payload[0]?.value
  const cls = cag >= 60 ? '#b060ff' : cag >= 40 ? '#e83060' : cag >= 36 ? '#f07820' : '#00e5a0'
  return (
    <div style={{
      background: '#0d1117', border: '1px solid #2a3f55', borderRadius: 8,
      padding: '8px 12px', fontFamily: "'Space Mono', monospace", fontSize: 11,
    }}>
      <div style={{ color: '#7a9bb5', marginBottom: 4 }}>Year {label}</div>
      <div style={{ color: cls, fontWeight: 700 }}>CAG = {cag?.toFixed(1)}</div>
    </div>
  )
}

// ─── GENE CONTROL ─────────────────────────────────────────────────────────────
function GeneControl({ id, genotype, onChange }) {
  const meta = GENE_META[id]
  const [open, setOpen] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        border: `1px solid ${genotype !== 'normal' ? meta.color : '#2a3f55'}`,
        borderRadius: 8, overflow: 'hidden',
        background: genotype !== 'normal' ? meta.color + '12' : '#0d1117',
        transition: 'all 0.2s',
      }}>
        {/* Header */}
        <div
          onClick={() => setOpen(o => !o)}
          style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: genotype !== 'normal' ? meta.color : '#2a3f55',
            flexShrink: 0, boxShadow: genotype !== 'normal' ? `0 0 8px ${meta.color}` : 'none',
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: genotype !== 'normal' ? meta.color : '#7a9bb5' }}>
              {id}
            </div>
            <div style={{ fontSize: 9, color: '#3d5a78', letterSpacing: '0.06em' }}>{meta.role}</div>
          </div>
          <div style={{
            fontSize: 9, padding: '2px 8px', borderRadius: 3,
            background: meta.direction === 'pro_expansion' ? '#e8306020' : meta.direction === 'anti_expansion' ? '#00e5a020' : '#f0c04020',
            color: meta.direction === 'pro_expansion' ? '#e83060' : meta.direction === 'anti_expansion' ? '#00e5a0' : '#f0c040',
            fontWeight: 700, letterSpacing: '0.08em',
          }}>
            {meta.direction === 'pro_expansion' ? 'PRO-EXP' : meta.direction === 'anti_expansion' ? 'ANTI-EXP' : 'SCAFFOLD'}
          </div>
        </div>

        {/* Genotype toggles */}
        <div style={{ display: 'flex', borderTop: '1px solid #1e2d3d' }}>
          {GENOTYPE_OPTS.map(opt => (
            <button key={opt.value}
              onClick={() => onChange(id, opt.value)}
              style={{
                flex: 1, padding: '7px 4px', border: 'none', cursor: 'pointer',
                background: genotype === opt.value ? meta.color + '28' : 'transparent',
                color: genotype === opt.value ? meta.color : '#3d5a78',
                fontSize: 10, fontWeight: genotype === opt.value ? 700 : 400,
                fontFamily: "'Space Mono', monospace",
                borderRight: '1px solid #1e2d3d',
                transition: 'all 0.15s',
              }}
            >
              <div>{opt.label}</div>
              <div style={{ fontSize: 8, opacity: 0.7 }}>{opt.desc}</div>
            </button>
          ))}
        </div>

        {/* Expandable mechanism detail */}
        {open && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid #1e2d3d', fontSize: 10, color: '#7a9bb5', lineHeight: 1.7 }}>
            <div style={{ color: meta.color, fontWeight: 700, marginBottom: 4, fontSize: 9, letterSpacing: '0.1em' }}>
              MECHANISM
            </div>
            {meta.mechanism}
            <div style={{ marginTop: 8, color: '#3d5a78', fontStyle: 'italic', fontSize: 9 }}>
              GWAS: {meta.gwas}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MLH1 BINDING PIE (SVG) ──────────────────────────────────────────────────
function BindingDiagram({ model }) {
  const { fan1Pct, msh3Pct, freePct } = model
  const total = 100
  const cx = 54, cy = 54, r = 40
  const toRad = (pct, start) => {
    const angle = (pct / total) * 2 * Math.PI - Math.PI / 2 + start
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  }
  const arc = (pct, startPct, color) => {
    if (pct <= 0) return null
    const startAngle = (startPct / total) * 2 * Math.PI - Math.PI / 2
    const endAngle = ((startPct + pct) / total) * 2 * Math.PI - Math.PI / 2
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle),   y2 = cy + r * Math.sin(endAngle)
    const large = pct > 50 ? 1 : 0
    return <path key={color} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`}
      fill={color} opacity={0.85} />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ fontSize: 9, color: '#3d5a78', letterSpacing: '0.12em' }}>MLH1 S2 SITE OCCUPANCY</div>
      <svg width="108" height="108">
        {arc(fan1Pct, 0, '#00e5a0')}
        {arc(msh3Pct, fan1Pct, '#e83060')}
        {arc(freePct, fan1Pct + msh3Pct, '#1e2d3d')}
        <circle cx={cx} cy={cy} r={22} fill="#0d1117" />
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="8" fill="#7a9bb5" fontFamily="monospace">MLH1</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize="7" fill="#3d5a78" fontFamily="monospace">S2 site</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 9, width: '100%' }}>
        {[
          { color: '#00e5a0', label: `FAN1 bound`, val: fan1Pct },
          { color: '#e83060', label: `MSH3 bound`, val: msh3Pct },
          { color: '#3d5a78', label: `free`,       val: freePct },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', color: r.color }}>
            <span>{r.label}</span><span>{r.val}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function GeneInteraction({ onRiskUpdate }) {
  const [germlineCAG, setGermlineCAG] = useState(42)
  const [genotypes, setGenotypes]     = useState({ MSH3: 'normal', FAN1: 'normal', MLH1: 'normal' })
  const [tissue, setTissue]           = useState('striatum')
  const [simResult, setSimResult]     = useState(null)
  const [tab, setTab]                 = useState('simulation') // 'simulation' | 'compare'

  const handleGenotype = useCallback((gene, val) => {
    setGenotypes(prev => ({ ...prev, [gene]: val }))
  }, [])

  // Re-run whenever inputs change
  useEffect(() => {
    const result = runSimulation(germlineCAG, genotypes, tissue, 50)
    setSimResult(result)
    if (onRiskUpdate) onRiskUpdate(result.data[result.data.length - 1].cag)
  }, [germlineCAG, genotypes, tissue])

  // Comparison: run all 8 key genotype combinations
  const compareData = (() => {
    const combos = [
      { label: 'WT all',            g: { MSH3:'normal', FAN1:'normal', MLH1:'normal' } },
      { label: 'MSH3 KO',          g: { MSH3:'knockout', FAN1:'normal', MLH1:'normal' } },
      { label: 'FAN1 KO',          g: { MSH3:'normal', FAN1:'knockout', MLH1:'normal' } },
      { label: 'MLH1 KO',          g: { MSH3:'normal', FAN1:'normal', MLH1:'knockout' } },
      { label: 'MSH3 het',         g: { MSH3:'het', FAN1:'normal', MLH1:'normal' } },
      { label: 'FAN1 het + MSH3 WT', g: { MSH3:'normal', FAN1:'het', MLH1:'normal' } },
      { label: 'MSH3 KO + FAN1 KO',  g: { MSH3:'knockout', FAN1:'knockout', MLH1:'normal' } },
      { label: 'MSH3 het + FAN1 WT', g: { MSH3:'het', FAN1:'normal', MLH1:'normal' } },
    ]
    return combos.map(c => {
      const r = computeNetExpansionRate(germlineCAG, c.g)
      return { label: c.label, rate: r.rate, mmrActivity: r.mmrActivity }
    })
  })()

  if (!simResult) return null
  const { data, model, onset, rate } = simResult
  const finalCAG = data[data.length - 1].cag
  const riskColor = finalCAG >= 60 ? '#b060ff' : finalCAG >= 40 ? '#e83060' : finalCAG >= 36 ? '#f07820' : '#00e5a0'

  const fg = '#3d5a78'
  const gridC = 'rgba(255,255,255,0.04)'

  return (
    <div style={{ fontFamily: "'Space Mono', 'Courier New', monospace", display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: '#3d5a78' }}>
            GENE–GENE INTERACTION NETWORK
          </div>
          <div style={{ fontSize: 10, color: '#7a9bb5', marginTop: 2 }}>
            MMR competitive binding model · FAN1 vs MSH3 for MLH1 S2 site
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {['simulation', 'compare'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              fontSize: 10, padding: '4px 12px', borderRadius: 4, cursor: 'pointer',
              fontFamily: "'Space Mono', monospace", letterSpacing: '0.08em',
              border: `1px solid ${tab === t ? '#00d4ff' : '#2a3f55'}`,
              background: tab === t ? '#00d4ff18' : 'transparent',
              color: tab === t ? '#00d4ff' : '#3d5a78',
            }}>
              {t === 'simulation' ? 'SIMULATE' : 'COMPARE'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'simulation' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {Object.keys(GENE_META).map(id => (
            <GeneControl key={id} id={id} genotype={genotypes[id]} onChange={handleGenotype} />
          ))}
        </div>
      )}

      {tab === 'simulation' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12, alignItems: 'start' }}>
          {/* Controls row */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 9, color: '#3d5a78', letterSpacing: '0.1em', marginBottom: 4 }}>GERMLINE CAG</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="range" min={36} max={70} value={germlineCAG}
                  onChange={e => setGermlineCAG(+e.target.value)}
                  style={{ width: 140, accentColor: '#00d4ff' }} />
                <span style={{ fontSize: 20, fontWeight: 700, color: riskColor, minWidth: 32 }}>{germlineCAG}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#3d5a78', letterSpacing: '0.1em', marginBottom: 4 }}>TISSUE</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {Object.keys(TISSUE_MULT).map(t => (
                  <button key={t} onClick={() => setTissue(t)} style={{
                    fontSize: 9, padding: '3px 8px', border: `1px solid ${tissue === t ? '#00d4ff' : '#2a3f55'}`,
                    borderRadius: 3, background: tissue === t ? '#00d4ff18' : 'transparent',
                    color: tissue === t ? '#00d4ff' : '#3d5a78',
                    cursor: 'pointer', fontFamily: "'Space Mono', monospace",
                  }}>{t}</button>
                ))}
              </div>
            </div>
          </div>
          <BindingDiagram model={model} />
        </div>
      )}

      {/* Chart */}
      {tab === 'simulation' && (
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke={gridC} strokeDasharray="3 3" />
              <XAxis dataKey="year" stroke={fg} tick={{ fill: fg, fontSize: 9, fontFamily: 'monospace' }}
                label={{ value: 'years', position: 'insideBottom', offset: -3, fill: fg, fontSize: 9 }} />
              <YAxis stroke={fg} tick={{ fill: fg, fontSize: 9, fontFamily: 'monospace' }}
                label={{ value: 'CAG', angle: -90, position: 'insideLeft', fill: fg, fontSize: 9 }}
                domain={[germlineCAG - 2, 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={40} stroke="#e83060" strokeDasharray="4 3" strokeWidth={1}
                label={{ value: 'HD threshold', position: 'right', fill: '#e83060', fontSize: 8, fontFamily: 'monospace' }} />
              <ReferenceLine y={60} stroke="#b060ff" strokeDasharray="4 3" strokeWidth={1}
                label={{ value: 'Juvenile HD', position: 'right', fill: '#b060ff', fontSize: 8, fontFamily: 'monospace' }} />
              <Line type="monotone" dataKey="cag" stroke={riskColor} strokeWidth={2}
                dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Compare tab */}
      {tab === 'compare' && (
        <div style={{ height: 260 }}>
          <div style={{ fontSize: 9, color: '#3d5a78', letterSpacing: '0.12em', marginBottom: 8 }}>
            SOMATIC EXPANSION RATE BY GENOTYPE COMBINATION (CAG/year · {tissue} · germline {germlineCAG}Q)
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={compareData} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
              <CartesianGrid stroke={gridC} strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke={fg}
                tick={{ fill: fg, fontSize: 8, fontFamily: 'monospace' }}
                interval={0} angle={-30} textAnchor="end" height={60} />
              <YAxis stroke={fg} tick={{ fill: fg, fontSize: 9, fontFamily: 'monospace' }}
                label={{ value: 'CAG/yr', angle: -90, position: 'insideLeft', fill: fg, fontSize: 9 }} />
              <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #2a3f55', borderRadius: 8, fontFamily: 'monospace', fontSize: 10 }} />
              <Line type="monotone" dataKey="rate" stroke="#00d4ff" strokeWidth={2} dot={{ r: 4, fill: '#00d4ff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats footer */}
      {tab === 'simulation' && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6,
          background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 8, padding: 12,
        }}>
          {[
            { label: 'EXPANSION RATE', val: `${rate.toFixed(2)} CAG/yr`, color: riskColor },
            { label: 'MMR COMPLEX', val: `${model.mmrActivity}% active`, color: '#f07820' },
            { label: `FINAL CAG (${tissue})`, val: finalCAG.toFixed(0), color: riskColor },
            { label: 'PRED. ONSET', val: onset ? `~${onset} yr` : 'N/A', color: onset && parseFloat(onset) < 50 ? '#e83060' : '#7a9bb5' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 8, letterSpacing: '0.12em', color: '#3d5a78', marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Source note */}
      <div style={{ fontSize: 9, color: '#2a3f55', lineHeight: 1.6, borderTop: '1px solid #1e2d3d', paddingTop: 10 }}>
        Model: Goold et al. 2021 Cell Reports · Wang et al. 2024 Cell · GeM-HD GWAS 2019 · Swami et al. 2009 Hum Mol Genet
        · Quantitative anchors: MSH3 WT→KO reduces striatal expansion 29× (+8.8→0.3 CAG/month, Wang 2024)
      </div>
      <GRNSimulator/>
    </div>
  )
}