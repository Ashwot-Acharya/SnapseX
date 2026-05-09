// ProteinViewer.jsx
import { useEffect, useRef, useState } from 'react';

const FLASK_BASE = '/api/htt';   // adjust if your prefix differs

// Load 3Dmol.js once from CDN
function use3Dmol() {
  const [ready, setReady] = useState(!!window.$3Dmol);
  useEffect(() => {
    if (window.$3Dmol) { setReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.1.0/3Dmol-min.js';
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

export default function ProteinViewer({ cagCount, overrideProtein }) {
  const viewerRef = useRef(null);
  const viewerInstance = useRef(null);
  const [status, setStatus] = useState('idle');   // idle | loading | done | error
  const [errMsg, setErrMsg] = useState('');
  const [mode, setMode] = useState('cartoon');    // cartoon | surface | stick
  const [colorScheme, setColorScheme] = useState('plddt'); // plddt | chain | spectrum
  const dmolReady = use3Dmol();

  // ── Fetch PDB then render ─────────────────────────────────────────
  useEffect(() => {
    if (!dmolReady || !viewerRef.current) return;
    if (!overrideProtein && cagCount === undefined) return;

    let cancelled = false;
    setStatus('loading');
    setErrMsg('');

    (async () => {
      try {
        let pdb = '';

        if (overrideProtein) {
          // Mutant sequence → ESMFold via Flask proxy
          // ESMFold caps at ~400 aa; send only N-terminal exon1 region
          const seq = overrideProtein.slice(0, 400);
          const res = await fetch(`${FLASK_BASE}/esmfold/fold`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sequence: seq }),
          });
          if (!res.ok) throw new Error(`ESMFold proxy: ${res.status}`);
          pdb = await res.text();
        } else {
          // Normal HTT → AlphaFold DB via Flask proxy
          const res = await fetch(`${FLASK_BASE}/alphafold/normal`);
          if (!res.ok) throw new Error(`AlphaFold proxy: ${res.status}`);
          pdb = await res.text();
        }

        if (cancelled) return;
        if (!pdb || pdb.length < 100) throw new Error('Empty PDB received');

        renderPDB(pdb);
        setStatus('done');
      } catch (e) {
        if (!cancelled) {
          setErrMsg(e.message);
          setStatus('error');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [dmolReady, overrideProtein, cagCount]);

  // Re-style without re-fetching when display settings change
  useEffect(() => {
    if (status === 'done' && viewerInstance.current) applyStyle();
  }, [mode, colorScheme, status]);

  // ── 3Dmol rendering helpers ───────────────────────────────────────
  function renderPDB(pdbText) {
    const container = viewerRef.current;
    container.innerHTML = '';   // clear old viewer

    const v = window.$3Dmol.createViewer(container, {
      backgroundColor: 'transparent',
      antialias: true,
    });
    viewerInstance.current = v;

    v.addModel(pdbText, 'pdb');
    applyStyle(v);
    v.zoomTo();
    v.spin('y', 0.5);
    v.render();
  }

  function applyStyle(v = viewerInstance.current) {
    if (!v) return;
    v.setStyle({}, {});   // clear

    const colorSpec = colorScheme === 'plddt'
      ? { colorfunc: (atom) => plddt_color(atom.b) }   // B-factor = pLDDT in AlphaFold PDBs
      : colorScheme === 'spectrum'
        ? { spectrum: true }
        : { chain: true };

    if (mode === 'cartoon') {
      v.setStyle({}, { cartoon: { ...colorSpec, thickness: 0.4 } });
    } else if (mode === 'surface') {
      v.setStyle({}, { cartoon: { ...colorSpec, opacity: 0.3, thickness: 0.3 } });
      v.addSurface(window.$3Dmol.SurfaceType.VWS, { opacity: 0.55, colorscheme: 'whiteCarbon' });
    } else {
      v.setStyle({}, { stick: { ...colorSpec, radius: 0.15 } });
    }
    v.render();
  }

  // pLDDT colour scale: 0=red → 50=orange → 70=yellow → 90=blue
  function plddt_color(score) {
    if (score >= 90) return '#1565C0';   // very high – dark blue
    if (score >= 70) return '#56AEE2';   // confident – light blue
    if (score >= 50) return '#F5C518';   // low – yellow
    return '#E55A4E';                    // very low – red
  }

  // ── UI ────────────────────────────────────────────────────────────
  return (
    <div style={{ marginTop: 16 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        {['cartoon', 'surface', 'stick'].map(m => (
          <button key={m} onClick={() => setMode(m)}
            style={{
              padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
              background: mode === m ? 'var(--blue)' : 'var(--surface2)',
              color: mode === m ? 'white' : 'var(--text)',
            }}>{m}</button>
        ))}
        <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-dim)', alignSelf: 'center' }}>Color:</span>
        {['plddt', 'spectrum', 'chain'].map(c => (
          <button key={c} onClick={() => setColorScheme(c)}
            style={{
              padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
              background: colorScheme === c ? 'var(--blue)' : 'var(--surface2)',
              color: colorScheme === c ? 'white' : 'var(--text)',
            }}>{c}</button>
        ))}
      </div>

      {/* Viewer box */}
      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden',
                    background: '#0d1117', border: '1px solid var(--border2)', height: 420 }}>

        {/* 3Dmol mount target */}
        <div ref={viewerRef} style={{ width: '100%', height: '100%' }} />

        {/* Loading overlay */}
        {status === 'loading' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: 'rgba(13,17,23,0.85)',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🧬</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>
              {overrideProtein ? 'Running ESMFold…' : 'Fetching AlphaFold structure…'}
            </div>
            <div style={{ marginTop: 12, width: 180, height: 3, background: 'var(--surface2)', borderRadius: 4 }}>
              <div style={{ height: '100%', width: '60%', background: 'var(--blue)',
                            borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          </div>
        )}

        {/* Error overlay */}
        {status === 'error' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: 'rgba(13,17,23,0.9)',
            padding: 24, textAlign: 'center',
          }}>
            <div style={{ fontSize: 28 }}>⚠️</div>
            <div style={{ color: '#F09595', marginTop: 8, fontSize: 13 }}>{errMsg}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 8 }}>
              Make sure Flask is running and CORS is enabled (flask-cors).
            </div>
          </div>
        )}

        {/* pLDDT legend (AlphaFold only) */}
        {status === 'done' && colorScheme === 'plddt' && (
          <div style={{
            position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.6)',
            borderRadius: 6, padding: '6px 10px', fontSize: 10, lineHeight: 1.8,
          }}>
            {[['#1565C0','≥ 90  Very high'],['#56AEE2','70–90 Confident'],
              ['#F5C518','50–70 Low'],['#E55A4E','< 50  Very low']].map(([c,l]) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                <span style={{ color: '#ccc' }}>{l}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6 }}>
        {overrideProtein
          ? `ESMFold prediction · First 400 aa · ${overrideProtein.length} aa total`
          : 'AlphaFold DB · Human HTT · AF-P42858-F1-v4'}
      </div>
    </div>
  );
}