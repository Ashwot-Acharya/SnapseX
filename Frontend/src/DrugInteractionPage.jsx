import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';

const API = '/api/htt';

const DRUG_TYPES = [
  { value: 'polyQ_binder',      label: 'Small molecule (polyQ binder)'  },
  { value: 'antisense_oligo',   label: 'Antisense oligonucleotide'      },
  { value: 'peptide_inhibitor', label: 'Peptide inhibitor'              },
];

// ── helpers ────────────────────────────────────────────────────────────
function computeKd(cag) {
  if (cag <= 35) return 200.0;
  return Math.max(0.5, Math.min(200, 50 * Math.exp(-0.08 * (cag - 35))));
}

function computeBoundFraction(conc, kd) {
  return conc / (conc + kd);
}

// ── tiny stat box ──────────────────────────────────────────────────────
function Stat({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--surface2)', borderRadius: 8,
      padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 600, color: color ?? 'var(--text-head)' }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{sub}</span>}
    </div>
  );
}

// ── section wrapper ────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '1px',
        textTransform: 'uppercase', color: 'var(--text-dim)',
        borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 14,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ── residue accessibility heatmap ──────────────────────────────────────
function AccessibilityHeatmap({ residues, hotspots }) {
  const [hovered, setHovered] = useState(null);
  if (!residues?.length) return null;

  const blockW = Math.max(4, Math.min(12, Math.floor(680 / residues.length)));

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1, marginBottom: 8 }}>
        {residues.map((r) => (
          <div
            key={r.index}
            onMouseEnter={() => setHovered(r)}
            onMouseLeave={() => setHovered(null)}
            style={{
              width: blockW, height: 26, borderRadius: 2,
              background: r.color,
              opacity: hovered?.index === r.index ? 1 : 0.78,
              cursor: 'default',
              outline: hotspots?.some(h => r.index >= h.start && r.index < h.end)
                ? '2px solid #fff' : 'none',
              transition: 'opacity 0.12s',
            }}
          />
        ))}
      </div>

      {hovered ? (
        <div style={{
          background: 'var(--surface2)', border: '1px solid var(--border2)',
          borderRadius: 7, padding: '7px 12px', fontSize: 12,
          display: 'inline-flex', gap: 16, marginBottom: 10,
        }}>
          <span>Residue <strong>{hovered.residue}</strong> #{hovered.index + 1}</span>
          <span>pLDDT <strong style={{ color: hovered.color }}>{hovered.plddt}</strong></span>
          <span><strong style={{ color: hovered.color }}>{hovered.label}</strong></span>
          <span>Access score <strong>{hovered.drug_access.toFixed(2)}</strong></span>
        </div>
      ) : (
        <div style={{ height: 34, marginBottom: 10 }} /> // reserve space so layout doesn't jump
      )}

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {[
          ['#E24B4A', 'Disordered   pLDDT < 50  — highly accessible'],
          ['#F5C518', 'Flexible     pLDDT 50–70 — moderate'],
          ['#56AEE2', 'Structured   pLDDT 70–90 — low'],
          ['#1565C0', 'Rigid        pLDDT > 90  — inaccessible'],
        ].map(([c, l]) => (
          <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-dim)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c, flexShrink: 0 }} />
            {l}
          </div>
        ))}
      </div>

      {hotspots?.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-dim)' }}>
          <span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>{hotspots.length}</span>{' '}
          binding hotspot{hotspots.length > 1 ? 's' : ''} detected (white outline) —
          disordered windows with mean accessibility &gt; 0.7
        </div>
      )}
    </div>
  );
}

// ── dose-response chart (pure frontend, no fetch needed) ───────────────
function DoseResponseChart({ cag, conc }) {
  const kd = computeKd(cag);
  const points = [];
  for (let c = 0; c <= 200; c += 2) {
    points.push({ conc: c, bound: parseFloat((c / (c + kd) * 100).toFixed(2)) });
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 4, right: 16, bottom: 24, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="conc" stroke="var(--text-dim)" fontSize={11}
               label={{ value: 'Drug concentration (µM)', position: 'insideBottom', offset: -14, fontSize: 11, fill: 'var(--text-dim)' }} />
        <YAxis stroke="var(--text-dim)" fontSize={11} unit="%" domain={[0, 100]} />
        <Tooltip
          contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 7, fontSize: 12 }}
          formatter={v => [`${v}%`, 'Bound fraction']}
          labelFormatter={v => `Conc: ${v} µM`}
        />
        {/* current concentration marker */}
        <ReferenceLine x={conc} stroke="#1D9E75" strokeDasharray="4 2"
                       label={{ value: `${conc}µM`, fontSize: 10, fill: '#1D9E75', position: 'top' }} />
        {/* Kd marker */}
        <ReferenceLine x={kd} stroke="#F5C518" strokeDasharray="4 2"
                       label={{ value: `Kd=${kd.toFixed(1)}µM`, fontSize: 10, fill: '#F5C518', position: 'insideTopRight' }} />
        <Line type="monotone" dataKey="bound" stroke="#56AEE2" dot={false} strokeWidth={2.5} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ══════════════════════════════════════════════════════════════════════
export default function DrugInteractionPage() {
  const [cag,       setCag]       = useState(45);
  const [conc,      setConc]      = useState(10);
  const [drugType,  setDrugType]  = useState('polyQ_binder');
  const [activeTab, setActiveTab] = useState('kinetics');

  // server data
  const [kinetics,  setKinetics]  = useState(null);
  const [access,    setAccess]    = useState(null);
  const [landscape, setLandscape] = useState(null);
  const [busy,      setBusy]      = useState({ kinetics: false, access: false, landscape: false });
  const [error,     setError]     = useState(null);

  // protein sequence built from CAG count (HTT exon1 N-terminal)
  const builtSequence = `MATLEKLMKAFESLKSF${'Q'.repeat(cag)}PPPPPPPPPPPQLPQPPPQAQPLLPQPQPPPPPPPPPPGPAVAEEPLHRPKK`;

  // ── fetchers ─────────────────────────────────────────────────────────
  const fetchKinetics = useCallback(async () => {
    setBusy(b => ({ ...b, kinetics: true }));
    try {
      const r = await fetch(`${API}/drug/kinetics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cag, drug_concentration: conc, drug_type: drugType, time_points: 120, t_max: 72 }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setKinetics(await r.json());
    } catch (e) { setError(`Kinetics: ${e.message}`); }
    setBusy(b => ({ ...b, kinetics: false }));
  }, [cag, conc, drugType]);

  const fetchAccess = useCallback(async () => {
    setBusy(b => ({ ...b, access: true }));
    try {
      const r = await fetch(`${API}/drug/accessibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence: builtSequence, cag }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setAccess(await r.json());
    } catch (e) { setError(`Accessibility: ${e.message}`); }
    setBusy(b => ({ ...b, access: false }));
  }, [cag, builtSequence]);

  const fetchLandscape = useCallback(async () => {
    setBusy(b => ({ ...b, landscape: true }));
    try {
      const r = await fetch(`${API}/drug/landscape_shift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cag, drug_concentration: conc }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setLandscape(await r.json());
    } catch (e) { setError(`Landscape: ${e.message}`); }
    setBusy(b => ({ ...b, landscape: false }));
  }, [cag, conc]);

  // refetch when params change
  useEffect(() => { fetchKinetics(); fetchLandscape(); }, [cag, conc, drugType]);
  // accessibility only on CAG change (sequence changes → re-fold)
  useEffect(() => { fetchAccess(); }, [cag]);

  // ── derived values (no fetch needed) ─────────────────────────────────
  const kd         = computeKd(cag);
  const boundFrac  = computeBoundFraction(conc, kd);
  const deltaG     = -(1.987e-3 * 310 * Math.log(kd));

  // kinetics chart data
  const kineticsData = kinetics?.times?.map((t, i) => ({
    t,
    no_drug:   kinetics.no_drug[i],
    with_drug: kinetics.with_drug[i],
  })) ?? [];

  const tabs = [
    { id: 'kinetics',  label: '① Aggregation kinetics'    },
    { id: 'dose',      label: '② Dose–response curve'     },
    { id: 'access',    label: '③ Binding site map'        },
    { id: 'landscape', label: '④ Fitness landscape shift'  },
  ];

  const rangeLabel = cag >= 60 ? 'juvenile-onset'
    : cag >= 40 ? 'full-penetrance disease'
    : cag >= 36 ? 'intermediate'
    : 'normal';

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', padding: '28px 20px 60px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* ── page header ── */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, margin: 0 }}>
            💊 Drug–Protein Interaction Model
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 6 }}>
            Biophysical binding model for mutant HTT · Oosawa nucleation-elongation kinetics ·
            Langmuir isotherm · ESMFold pLDDT accessibility
          </p>
        </div>

        {/* ── controls panel ── */}
        <div style={{
          display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end',
          padding: '14px 18px', background: 'var(--surface2)',
          borderRadius: 10, marginBottom: 24, border: '1px solid var(--border)',
        }}>
          {/* CAG slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 220, flex: 1 }}>
            <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              CAG repeat length —{' '}
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{cag} repeats</span>
              {' '}
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 10,
                color: cag >= 40 ? '#E24B4A' : cag >= 36 ? '#F5C518' : '#1D9E75',
              }}>
                ({rangeLabel})
              </span>
            </label>
            <input type="range" min={10} max={80} step={1} value={cag}
                   onChange={e => setCag(+e.target.value)} style={{ width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)' }}>
              <span>10 normal</span><span>36 intermediate</span><span>40 disease</span><span>60 juvenile</span>
            </div>
          </div>

          {/* Concentration slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200, flex: 1 }}>
            <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              Drug concentration —{' '}
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{conc} µM</span>
              {' '}
              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                (Kd = {kd.toFixed(1)} µM · {Math.round(boundFrac * 100)}% bound)
              </span>
            </label>
            <input type="range" min={0} max={100} step={1} value={conc}
                   onChange={e => setConc(+e.target.value)} style={{ width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)' }}>
              <span>0 µM</span><span>Kd ≈ {kd.toFixed(0)} µM</span><span>100 µM</span>
            </div>
          </div>

          {/* Drug type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>Drug type</label>
            <select value={drugType} onChange={e => setDrugType(e.target.value)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}>
              {DRUG_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)',
            borderRadius: 7, padding: '8px 14px', fontSize: 12, color: '#F09595', marginBottom: 16,
          }}>
            ⚠ {error} — check Flask is running with CORS enabled.
          </div>
        )}

        {/* ── key stats strip ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: 26 }}>
          <Stat label="Binding affinity Kd"   value={`${kd.toFixed(1)} µM`}         sub="lower = stronger binding" />
          <Stat label="ΔG binding"             value={`${deltaG.toFixed(1)} kcal/mol`} sub="free energy of binding" />
          <Stat label="Bound fraction"
                value={`${Math.round(boundFrac * 100)}%`}
                sub={`at ${conc} µM`}
                color={boundFrac > 0.5 ? '#1D9E75' : boundFrac > 0.2 ? '#F5C518' : '#E24B4A'} />
          {kinetics && <>
            <Stat label="Lag phase — no drug"  value={`${kinetics.lag_no_drug}h`}    sub="time to 10% aggregation"  color="#E24B4A" />
            <Stat label="Lag phase — +drug"    value={`${kinetics.lag_with_drug}h`}  sub="time to 10% aggregation"  color="#1D9E75" />
            <Stat label="Lag extension"
                  value={`+${(kinetics.lag_with_drug - kinetics.lag_no_drug).toFixed(1)}h`}
                  sub="drug benefit"
                  color="#56AEE2" />
          </>}
        </div>

        {/* ── tab bar ── */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 22, borderBottom: '1px solid var(--border)' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                fontFamily: 'var(--mono)', fontSize: 11, padding: '8px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: activeTab === tab.id ? 'var(--text-head)' : 'var(--text-dim)',
                borderBottom: activeTab === tab.id ? '2px solid var(--blue)' : '2px solid transparent',
                marginBottom: -1, transition: 'color 0.15s',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══ Tab 1: Aggregation kinetics ══ */}
        {activeTab === 'kinetics' && (
          <Section title="Oosawa nucleation-elongation model · aggregated fraction vs time (hours)">
            {busy.kinetics
              ? <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>Simulating ODE…</div>
              : kineticsData.length > 0 && (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={kineticsData} margin={{ top: 6, right: 20, bottom: 28, left: 0 }}>
                      <defs>
                        <linearGradient id="gnd" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#E24B4A" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#E24B4A" stopOpacity={0}    />
                        </linearGradient>
                        <linearGradient id="gwd" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}    />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="t" stroke="var(--text-dim)" fontSize={11}
                             label={{ value: 'Time (hours)', position: 'insideBottom', offset: -16, fontSize: 11, fill: 'var(--text-dim)' }} />
                      <YAxis stroke="var(--text-dim)" fontSize={11}
                             tickFormatter={v => `${Math.round(v * 100)}%`} domain={[0, 1]} />
                      <Tooltip
                        contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 7, fontSize: 12 }}
                        formatter={(v, name) => [`${(v * 100).toFixed(1)}%`, name === 'no_drug' ? 'No drug' : `+drug (${conc}µM)`]}
                        labelFormatter={v => `Time: ${v}h`}
                      />
                      <Legend
                        formatter={v => v === 'no_drug' ? 'No drug' : `With drug (${conc} µM)`}
                        wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                      />
                      <ReferenceLine x={kinetics.lag_no_drug}  stroke="#E24B4A" strokeDasharray="4 2"
                                     label={{ value: `Lag ${kinetics.lag_no_drug}h`,  fontSize: 9, fill: '#E24B4A', position: 'top' }} />
                      <ReferenceLine x={kinetics.lag_with_drug} stroke="#1D9E75" strokeDasharray="4 2"
                                     label={{ value: `Lag ${kinetics.lag_with_drug}h`, fontSize: 9, fill: '#1D9E75', position: 'top' }} />
                      <ReferenceLine y={0.1} stroke="rgba(255,255,255,0.15)" strokeDasharray="2 2" />
                      <Area type="monotone" dataKey="no_drug"   stroke="#E24B4A" fill="url(#gnd)" strokeWidth={2.5} dot={false} />
                      <Area type="monotone" dataKey="with_drug" stroke="#1D9E75" fill="url(#gwd)" strokeWidth={2.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>

                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                    <strong style={{ color: 'var(--text)' }}>Reading this chart · </strong>
                    The S-shaped curve reflects cooperative amyloid nucleation: the lag phase
                    (flat region) is when misfolded monomers slowly form a nucleus. Once a nucleus
                    exists, elongation is rapid (steep rise). Drug at {conc} µM
                    ({Math.round(boundFrac * 100)}% receptor occupancy) suppresses nucleation by{' '}
                    <strong>{Math.round(boundFrac * 85)}%</strong> and elongation by{' '}
                    <strong>{Math.round(boundFrac * 60)}%</strong>, extending the lag phase by{' '}
                    <strong>{(kinetics.lag_with_drug - kinetics.lag_no_drug).toFixed(1)}h</strong>.
                  </div>
                </>
              )
            }
          </Section>
        )}

        {/* ══ Tab 2: Dose-response ══ */}
        {activeTab === 'dose' && (
          <Section title="Langmuir binding isotherm · receptor occupancy vs drug concentration">
            <DoseResponseChart cag={cag} conc={conc} />
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                <strong style={{ color: 'var(--text)' }}>Langmuir model · </strong>
                Bound fraction = [drug] / ([drug] + Kd). The Kd (yellow dashed line) is the
                concentration at 50% occupancy. For {cag}Q mutant, Kd = {kd.toFixed(1)} µM —
                {cag > 35
                  ? ` lower than the normal HTT Kd of 200 µM because the expanded polyQ exposes more hydrophobic surface, increasing binding affinity.`
                  : ` similar to normal HTT (200 µM) because repeat length is in the normal range.`}
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                <strong style={{ color: 'var(--text)' }}>Your current dose · </strong>
                At {conc} µM (green line), {Math.round(boundFrac * 100)}% of accessible sites
                are occupied. ΔG = {deltaG.toFixed(1)} kcal/mol.
                {boundFrac < 0.3 && ' Consider increasing concentration — you are well below Kd.'}
                {boundFrac >= 0.3 && boundFrac < 0.7 && ' You are near the EC50 region where small concentration changes have the most effect.'}
                {boundFrac >= 0.7 && ' High occupancy — further concentration increases yield diminishing returns.'}
              </div>
            </div>
          </Section>
        )}

        {/* ══ Tab 3: Binding site accessibility ══ */}
        {activeTab === 'access' && (
          <Section title="Per-residue drug accessibility · derived from ESMFold pLDDT confidence scores">
            {busy.access && (
              <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
                Folding sequence with ESMFold and computing per-residue accessibility…
              </div>
            )}
            {access && !busy.access && (
              <>
                <div style={{ marginBottom: 14, fontSize: 12, color: 'var(--text-dim)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <span>
                    Source:{' '}
                    <span style={{ fontFamily: 'var(--mono)', color: access.source === 'esmfold' ? '#1D9E75' : '#F5C518' }}>
                      {access.source === 'esmfold' ? 'ESMFold (real pLDDT)' : 'Heuristic fallback — ESMFold unavailable'}
                    </span>
                  </span>
                  <span>{access.total} residues analyzed</span>
                  <span>{access.hotspots?.length ?? 0} hotspot window{access.hotspots?.length !== 1 ? 's' : ''} detected</span>
                </div>
                <AccessibilityHeatmap residues={access.residues} hotspots={access.hotspots} />
                <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                  <strong style={{ color: 'var(--text)' }}>Why this matters · </strong>
                  The polyQ region in HTT is intrinsically disordered — ESMFold assigns it low
                  pLDDT confidence (red blocks) because there is no single stable conformation.
                  This disorder is paradoxically what makes it drug-accessible: the exposed,
                  flexible backbone can be bound by small molecules that stabilise a specific
                  conformation. Structured regions (blue) are tightly folded and resist
                  penetration by most drug-like molecules. White outlines mark windows where
                  five consecutive residues all score high accessibility.
                </div>
              </>
            )}
          </Section>
        )}

        {/* ══ Tab 4: Fitness landscape ══ */}
        {activeTab === 'landscape' && (
          <Section title="Fitness landscape shift · before vs after drug treatment across all CAG lengths">
            {busy.landscape
              ? <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>Computing landscape…</div>
              : landscape?.points?.length > 0 && (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={landscape.points} margin={{ top: 6, right: 20, bottom: 28, left: 0 }}>
                      <defs>
                        <linearGradient id="gfb" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#E24B4A" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#E24B4A" stopOpacity={0}   />
                        </linearGradient>
                        <linearGradient id="gfa" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="cag" stroke="var(--text-dim)" fontSize={11}
                             label={{ value: 'CAG repeat length', position: 'insideBottom', offset: -16, fontSize: 11, fill: 'var(--text-dim)' }} />
                      <YAxis stroke="var(--text-dim)" fontSize={11}
                             tickFormatter={v => `${Math.round(v * 100)}%`} domain={[0, 1]} />
                      <Tooltip
                        contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 7, fontSize: 12 }}
                        formatter={(v, name) => [
                          `${(v * 100).toFixed(1)}%`,
                          name === 'fitness_before' ? 'Before drug' : `After drug (${conc}µM)`,
                        ]}
                        labelFormatter={v => `CAG: ${v}`}
                      />
                      <Legend
                        formatter={v => v === 'fitness_before' ? 'Before drug' : `After drug (${conc} µM)`}
                        wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                      />
                      {/* threshold markers */}
                      <ReferenceLine x={36} stroke="rgba(245,197,24,0.4)"  strokeDasharray="3 1"
                                     label={{ value: 'intermediate', fontSize: 9, fill: '#F5C518', position: 'top' }} />
                      <ReferenceLine x={40} stroke="rgba(226,75,74,0.5)"   strokeDasharray="3 1"
                                     label={{ value: 'disease', fontSize: 9, fill: '#E24B4A', position: 'top' }} />
                      <ReferenceLine x={60} stroke="rgba(226,75,74,0.3)"   strokeDasharray="3 1"
                                     label={{ value: 'juvenile', fontSize: 9, fill: '#E24B4A', position: 'top' }} />
                      {/* your CAG */}
                      <ReferenceLine x={cag} stroke="#F5C518" strokeWidth={1.5}
                                     label={{ value: `You (${cag}Q)`, fontSize: 10, fill: '#F5C518', position: 'insideTopRight' }} />
                      <Area type="monotone" dataKey="fitness_before" stroke="#E24B4A" fill="url(#gfb)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="fitness_after"  stroke="#1D9E75" fill="url(#gfa)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>

                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                    <strong style={{ color: 'var(--text)' }}>Reading this chart · </strong>
                    Drug effect is negligible below CAG=35 because Kd is very high (poor binding
                    to normal-length polyQ). The gap between the two curves widens exponentially
                    with repeat length — the same drug that does little for CAG=36 can substantially
                    restore fitness at CAG=60. Your sequence ({cag}Q, yellow line) sits in the{' '}
                    <strong>{rangeLabel}</strong> range, where the drug at {conc} µM shifts fitness
                    by{' '}
                    <strong style={{ color: '#1D9E75' }}>
                      +{((landscape.points.find(p => p.cag === cag)?.delta ?? 0) * 100).toFixed(1)}%
                    </strong>.
                  </div>
                </>
              )
            }
          </Section>
        )}

        {/* ── model disclaimer ── */}
        <div style={{
          marginTop: 8, padding: '10px 16px', borderRadius: 8, fontSize: 11,
          color: 'var(--text-dim)', background: 'rgba(107,114,128,0.07)',
          border: '1px solid var(--border)', lineHeight: 1.7,
        }}>
          <strong style={{ color: 'var(--text)' }}>Model transparency · </strong>
          Binding affinities use a Langmuir isotherm with Kd scaled exponentially to polyQ length
          (Kd = 50·e^(−0.08×(CAG−35)) µM for CAG&gt;35). Aggregation kinetics follow the Oosawa
          nucleation-elongation model: dM/dt = k_n(1−M)² + k_e·M(1−M) − k_off·M, with rate
          constants proportional to aggregation propensity. Per-residue accessibility is derived
          from ESMFold pLDDT B-factors: disordered regions (pLDDT&lt;50) are drug-accessible.
          This is a biophysical simulation — not a docked structure or clinical prediction.
        </div>
      </div>
    </div>
  );
}