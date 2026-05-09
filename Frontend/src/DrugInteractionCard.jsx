import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';

const API = '/api/htt';

const DRUG_TYPES = [
  { value: 'polyQ_binder',      label: 'Small molecule (polyQ binder)' },
  { value: 'antisense_oligo',   label: 'Antisense oligonucleotide'     },
  { value: 'peptide_inhibitor', label: 'Peptide inhibitor'             },
];

// ── tiny reusable stat box ────────────────────────────────────────────
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

// ── Section wrapper ───────────────────────────────────────────────────
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

// ── Residue accessibility heatmap ─────────────────────────────────────
function AccessibilityHeatmap({ residues, hotspots }) {
  const [hovered, setHovered] = useState(null);
  if (!residues?.length) return null;

  const blockW = Math.max(4, Math.min(12, Math.floor(700 / residues.length)));

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1, marginBottom: 8 }}>
        {residues.map((r) => (
          <div
            key={r.index}
            onMouseEnter={() => setHovered(r)}
            onMouseLeave={() => setHovered(null)}
            style={{
              width: blockW, height: 24, borderRadius: 2,
              background: r.color,
              opacity: hovered?.index === r.index ? 1 : 0.82,
              cursor: 'default',
              outline: hotspots?.some(h => r.index >= h.start && r.index < h.end)
                ? '2px solid #fff' : 'none',
              transition: 'opacity 0.15s',
            }}
          />
        ))}
      </div>

      {/* Tooltip */}
      {hovered && (
        <div style={{
          background: 'var(--surface2)', border: '1px solid var(--border2)',
          borderRadius: 7, padding: '8px 12px', fontSize: 12,
          display: 'inline-flex', gap: 16, marginBottom: 8,
        }}>
          <span>Residue <strong>{hovered.residue}</strong> #{hovered.index + 1}</span>
          <span>pLDDT <strong style={{ color: hovered.color }}>{hovered.plddt}</strong></span>
          <span>Accessibility <strong style={{ color: hovered.color }}>{hovered.label}</strong></span>
          <span>Drug access score <strong>{hovered.drug_access.toFixed(2)}</strong></span>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          ['#E24B4A', 'Disordered  pLDDT < 50  — highly accessible'],
          ['#F5C518', 'Flexible    pLDDT 50–70  — moderately accessible'],
          ['#56AEE2', 'Structured  pLDDT 70–90  — low accessibility'],
          ['#1565C0', 'Rigid       pLDDT > 90   — inaccessible'],
        ].map(([c, l]) => (
          <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-dim)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c, flexShrink: 0 }} />
            {l}
          </div>
        ))}
      </div>

      {hotspots?.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-dim)' }}>
          <span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>{hotspots.length}</span> binding
          hotspot{hotspots.length > 1 ? 's' : ''} detected (white outline) — disordered windows
          with mean accessibility &gt; 0.7
        </div>
      )}
    </div>
  );
}

// ── Dose-response curve (Langmuir isotherm) ───────────────────────────
function DoseResponseChart({ cag }) {
  const points = [];
  const kd = cag <= 35 ? 200 : Math.max(0.5, Math.min(200, 50 * Math.exp(-0.08 * (cag - 35))));
  for (let c = 0; c <= 200; c += 2) {
    const bf = c / (c + kd);
    points.push({ conc: c, bound: parseFloat((bf * 100).toFixed(2)), kd_line: 50 });
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={points} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="conc" stroke="var(--text-dim)" fontSize={11}
               label={{ value: 'Drug conc. (µM)', position: 'insideBottom', offset: -2, fontSize: 11, fill: 'var(--text-dim)' }} />
        <YAxis stroke="var(--text-dim)" fontSize={11} unit="%" domain={[0, 100]} />
        <Tooltip
          contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 7, fontSize: 12 }}
          formatter={(v) => [`${v}%`, 'Bound fraction']}
          labelFormatter={(v) => `Conc: ${v} µM`}
        />
        <ReferenceLine x={kd} stroke="#F5C518" strokeDasharray="4 2"
                       label={{ value: `Kd=${kd.toFixed(1)}µM`, fontSize: 10, fill: '#F5C518' }} />
        <Line type="monotone" dataKey="bound" stroke="#56AEE2" dot={false} strokeWidth={2} name="Bound fraction" />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function DrugInteractionCard({ cagCount, proteinSequence }) {
  const cag = cagCount ?? 45;

  const [drugType,  setDrugType]  = useState('polyQ_binder');
  const [conc,      setConc]      = useState(10);
  const [kinetics,  setKinetics]  = useState(null);
  const [access,    setAccess]    = useState(null);
  const [landscape, setLandscape] = useState(null);
  const [loading,   setLoading]   = useState({ kinetics: false, access: false, landscape: false });
  const [error,     setError]     = useState(null);
  const [activeTab, setActiveTab] = useState('kinetics');

  // ── fetch all three panels ──────────────────────────────────────────
  const fetchKinetics = useCallback(async () => {
    setLoading(l => ({ ...l, kinetics: true }));
    try {
      const r = await fetch(`${API}/drug/kinetics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cag, drug_concentration: conc, drug_type: drugType }),
      });
      setKinetics(await r.json());
    } catch (e) { setError('Kinetics fetch failed'); }
    setLoading(l => ({ ...l, kinetics: false }));
  }, [cag, conc, drugType]);

  const fetchAccess = useCallback(async () => {
    if (!proteinSequence) return;
    setLoading(l => ({ ...l, access: true }));
    try {
      const r = await fetch(`${API}/drug/accessibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence: proteinSequence, cag }),
      });
      setAccess(await r.json());
    } catch (e) { setError('Accessibility fetch failed'); }
    setLoading(l => ({ ...l, access: false }));
  }, [cag, proteinSequence]);

  const fetchLandscape = useCallback(async () => {
    setLoading(l => ({ ...l, landscape: true }));
    try {
      const r = await fetch(`${API}/drug/landscape_shift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cag, drug_concentration: conc }),
      });
      setLandscape(await r.json());
    } catch (e) { setError('Landscape fetch failed'); }
    setLoading(l => ({ ...l, landscape: false }));
  }, [cag, conc]);

  // refetch kinetics + landscape when params change
  useEffect(() => { fetchKinetics(); fetchLandscape(); }, [cag, conc, drugType]);

  // accessibility only when sequence available
  useEffect(() => { if (proteinSequence) fetchAccess(); }, [proteinSequence, cag]);

  const tabs = [
    { id: 'kinetics',  label: '① Aggregation kinetics'   },
    { id: 'dose',      label: '② Dose–response curve'    },
    { id: 'access',    label: '③ Binding site map'       },
    { id: 'landscape', label: '④ Fitness landscape shift' },
  ];

  // Prepare kinetics chart data
  const kineticsData = kinetics?.times?.map((t, i) => ({
    t,
    no_drug:   kinetics.no_drug[i],
    with_drug: kinetics.with_drug[i],
  })) ?? [];

  // Prepare landscape chart data
  const landscapeData = landscape?.points ?? [];

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p className="card-label">💊 Drug–Protein Interaction Model</p>
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Biophysical binding model for {cag}Q mutant HTT · pLDDT-based accessibility ·
          Oosawa nucleation-elongation kinetics · Langmuir isotherm
        </p>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end',
        padding: '12px 14px', background: 'var(--surface2)',
        borderRadius: 9, marginBottom: 20, border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>Drug type</label>
          <select value={drugType} onChange={e => setDrugType(e.target.value)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: 'var(--text)' }}>
            {DRUG_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            Drug concentration — <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{conc} µM</span>
          </label>
          <input type="range" min={0} max={100} step={1} value={conc}
            onChange={e => setConc(+e.target.value)} style={{ width: '100%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)' }}>
            <span>0 µM</span>
            <span>Kd ≈ {cag <= 35 ? 200 : Math.max(0.5, 50 * Math.exp(-0.08 * (cag - 35))).toFixed(1)} µM</span>
            <span>100 µM</span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 7, padding: '8px 12px', fontSize: 12, color: '#F09595', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Key stats (always visible) */}
      {kinetics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: 24 }}>
          <Stat label="Kd" value={`${kinetics.kd_um} µM`} sub="binding affinity" />
          <Stat label="Bound fraction" value={`${Math.round(kinetics.bound_fraction * 100)}%`}
                sub={`at ${conc} µM`} color={kinetics.bound_fraction > 0.5 ? '#1D9E75' : '#F5C518'} />
          <Stat label="Lag phase (no drug)" value={`${kinetics.lag_no_drug}h`}
                sub="time to 10% aggregation" color="#E24B4A" />
          <Stat label="Lag phase (+ drug)" value={`${kinetics.lag_with_drug}h`}
                sub="time to 10% aggregation" color="#1D9E75" />
          <Stat label="Lag phase extension"
                value={`+${(kinetics.lag_with_drug - kinetics.lag_no_drug).toFixed(1)}h`}
                sub="drug benefit" color="#56AEE2" />
          <Stat label="Aggregation propensity" value={kinetics.agg_propensity}
                sub={`for ${cag}Q repeat`} color={kinetics.agg_propensity > 0.5 ? '#E24B4A' : '#1D9E75'} />
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              fontFamily: 'var(--mono)', fontSize: 11, padding: '7px 14px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.id ? 'var(--text-head)' : 'var(--text-dim)',
              borderBottom: activeTab === tab.id ? '2px solid var(--blue)' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Aggregation kinetics ── */}
      {activeTab === 'kinetics' && (
        <Section title="Oosawa nucleation-elongation model · aggregated fraction vs time">
          {loading.kinetics
            ? <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Simulating ODE…</div>
            : kineticsData.length > 0 && (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={kineticsData} margin={{ top: 4, right: 16, bottom: 20, left: 0 }}>
                    <defs>
                      <linearGradient id="nd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#E24B4A" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#E24B4A" stopOpacity={0}   />
                      </linearGradient>
                      <linearGradient id="wd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="t" stroke="var(--text-dim)" fontSize={11}
                           label={{ value: 'Time (hours)', position: 'insideBottom', offset: -12, fontSize: 11, fill: 'var(--text-dim)' }} />
                    <YAxis stroke="var(--text-dim)" fontSize={11} tickFormatter={v => `${Math.round(v * 100)}%`} domain={[0, 1]} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 7, fontSize: 12 }}
                      formatter={(v, name) => [`${(v * 100).toFixed(1)}%`, name === 'no_drug' ? 'No drug' : 'With drug']}
                      labelFormatter={v => `Time: ${v}h`}
                    />
                    <Legend formatter={v => v === 'no_drug' ? 'No drug' : `+ drug (${conc}µM)`}
                            wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    {kinetics && (
                      <ReferenceLine x={kinetics.lag_no_drug} stroke="#E24B4A" strokeDasharray="4 2"
                                     label={{ value: 'Lag (no drug)', fontSize: 9, fill: '#E24B4A' }} />
                    )}
                    {kinetics && (
                      <ReferenceLine x={kinetics.lag_with_drug} stroke="#1D9E75" strokeDasharray="4 2"
                                     label={{ value: 'Lag (+drug)', fontSize: 9, fill: '#1D9E75' }} />
                    )}
                    <Area type="monotone" dataKey="no_drug"   stroke="#E24B4A" fill="url(#nd)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="with_drug" stroke="#1D9E75" fill="url(#wd)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
                  The sigmoid shape reflects cooperative nucleation followed by rapid elongation.
                  Drug extends the lag phase by suppressing nucleation (k_n×{(1 - kinetics.bound_fraction * 0.85).toFixed(2)})
                  and elongation (k_e×{(1 - kinetics.bound_fraction * 0.60).toFixed(2)}).
                </p>
              </>
            )
          }
        </Section>
      )}

      {/* ── Tab: Dose-response ── */}
      {activeTab === 'dose' && (
        <Section title="Langmuir binding isotherm · bound fraction vs drug concentration">
          <DoseResponseChart cag={cag} />
          <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
            The Kd (yellow dashed line) is the concentration at 50% occupancy.
            For {cag}Q repeats the Kd is lower than normal HTT — the expanded polyQ
            exposes more hydrophobic surface, increasing drug affinity.
          </p>
        </Section>
      )}

      {/* ── Tab: Binding site accessibility ── */}
      {activeTab === 'access' && (
        <Section title="Per-residue drug accessibility · derived from ESMFold pLDDT confidence">
          {!proteinSequence && (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '20px 0' }}>
              No protein sequence available. Submit a sequence in the input panel above to see the binding site map.
            </div>
          )}
          {proteinSequence && loading.access && (
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              Fetching ESMFold structure and computing accessibility…
            </div>
          )}
          {access && !loading.access && (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
                Source: <span style={{ fontFamily: 'var(--mono)', color: access.source === 'esmfold' ? '#1D9E75' : '#F5C518' }}>
                  {access.source === 'esmfold' ? 'ESMFold pLDDT (real)' : 'Heuristic fallback (ESMFold unavailable)'}
                </span>
                &nbsp;· {access.total} residues · {access.hotspots?.length ?? 0} hotspot windows
              </div>
              <AccessibilityHeatmap residues={access.residues} hotspots={access.hotspots} />
            </>
          )}
        </Section>
      )}

      {/* ── Tab: Fitness landscape shift ── */}
      {activeTab === 'landscape' && (
        <Section title="Fitness landscape · before vs after drug treatment across all CAG lengths">
          {loading.landscape
            ? <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Computing landscape…</div>
            : landscapeData.length > 0 && (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={landscapeData} margin={{ top: 4, right: 16, bottom: 20, left: 0 }}>
                    <defs>
                      <linearGradient id="fb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#E24B4A" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#E24B4A" stopOpacity={0}    />
                      </linearGradient>
                      <linearGradient id="fa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="cag" stroke="var(--text-dim)" fontSize={11}
                           label={{ value: 'CAG repeat length', position: 'insideBottom', offset: -12, fontSize: 11, fill: 'var(--text-dim)' }} />
                    <YAxis stroke="var(--text-dim)" fontSize={11} domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 7, fontSize: 12 }}
                      formatter={(v, name) => [`${(v * 100).toFixed(1)}%`, name === 'fitness_before' ? 'Before drug' : 'After drug']}
                      labelFormatter={v => `CAG: ${v}`}
                    />
                    <Legend formatter={v => v === 'fitness_before' ? 'Before drug' : `After drug (${conc}µM)`}
                            wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <ReferenceLine x={cag} stroke="#F5C518" strokeDasharray="4 2"
                                   label={{ value: `Your CAG=${cag}`, fontSize: 9, fill: '#F5C518' }} />
                    <ReferenceLine x={40} stroke="rgba(226,75,74,0.4)" strokeDasharray="3 1" />
                    <Area type="monotone" dataKey="fitness_before" stroke="#E24B4A" fill="url(#fb)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="fitness_after"  stroke="#1D9E75" fill="url(#fa)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
                  Drug effect is minimal below CAG=35 (low Kd → poor binding to normal HTT).
                  The gap widens with repeat length because binding affinity improves exponentially
                  with polyQ expansion. Your sequence ({cag}Q, yellow line) sits in the
                  {cag >= 60 ? ' juvenile-onset' : cag >= 40 ? ' full-penetrance disease' : cag >= 36 ? ' intermediate' : ' normal'} range.
                </p>
              </>
            )
          }
        </Section>
      )}

      {/* Scientific disclaimer */}
      <div style={{
        marginTop: 8, padding: '10px 14px', borderRadius: 8, fontSize: 11,
        color: 'var(--text-dim)', background: 'rgba(107,114,128,0.08)',
        border: '1px solid var(--border)',
      }}>
        <strong style={{ color: 'var(--text)' }}>Model note · </strong>
        Binding affinities use a Langmuir isotherm with Kd scaled exponentially to CAG length.
        Aggregation kinetics follow the Oosawa nucleation-elongation model with rate constants
        derived from the aggregation propensity score. Accessibility is computed from ESMFold
        pLDDT (B-factor column): low confidence regions are intrinsically disordered and
        therefore drug-accessible. This is a biophysical simulation, not a docked structure.
      </div>
    </div>
  );
}