import { useState } from 'react';
import { foldSequence, dnaToProtein, buildMutantProtein } from './api';
import ProteinViewer from './ProteinViewer';
import DrugInteractionCard from './DrugInteractionCard';

// Helper: count consecutive Q runs (polyQ length)
function getPolyQLength(proteinSeq) {
  const match = proteinSeq.match(/Q+/);
  if (!match) return 0;
  return match[0].length;
}

export default function MutatedProteinAnalyzer() {
  const [inputType, setInputType] = useState('protein'); // 'protein' or 'dna' or 'cag'
  const [proteinSeq, setProteinSeq] = useState('');
  const [cagCount, setCagCount] = useState(45);
  const [dnaSeq, setDnaSeq] = useState('');
  const [submittedSeq, setSubmittedSeq] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    let finalSeq = '';
    if (inputType === 'protein') {
      finalSeq = proteinSeq.trim();
      if (!finalSeq) return;
    } else if (inputType === 'dna') {
      const prot = dnaToProtein(dnaSeq);
      if (!prot) {
        setError('Invalid DNA sequence – no reading frame');
        return;
      }
      finalSeq = prot;
    } else if (inputType === 'cag') {
      // Build a minimal protein with the given polyQ length (N-terminal HTT)
      const canonicalBase = 'MATLEKLMKAFESLKSF' + 'Q'.repeat(24) + 'PPPPPPPPPPPQLPQPPPQAQPLLPQPQPPPPPPPPPPGPAVAEEPLHRPKK';
      finalSeq = buildMutantProtein(canonicalBase, cagCount);
    }
    setSubmittedSeq(finalSeq);
    setStatus('submitted');
    setError('');
  };

  const polyQLen = submittedSeq ? getPolyQLength(submittedSeq) : 0;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <p className="card-label">🧬 Mutant Protein Analyzer (AlphaFold + ESMFold)</p>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>
        Paste a mutant huntingtin protein sequence, or generate from DNA / CAG count.
        The structure is predicted via <strong>ESMFold</strong> (Meta) and coloured by pLDDT confidence.
      </p>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <select value={inputType} onChange={e => setInputType(e.target.value)} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '6px 12px' }}>
          <option value="protein">Protein sequence</option>
          <option value="dna">DNA sequence (translate)</option>
          <option value="cag">CAG count (auto‑build HTT N‑term)</option>
        </select>

        {inputType === 'protein' && (
          <textarea
            rows={3}
            value={proteinSeq}
            onChange={e => setProteinSeq(e.target.value)}
            placeholder="MATE... (mutated huntingtin protein)"
            style={{ flex: 1, background: 'var(--surface2)', fontFamily: 'monospace', fontSize: 12, padding: '8px', borderRadius: 6, border: '1px solid var(--border2)' }}
          />
        )}
        {inputType === 'dna' && (
          <textarea
            rows={3}
            value={dnaSeq}
            onChange={e => setDnaSeq(e.target.value)}
            placeholder="ATG CAG CAG ... (DNA sequence containing CAG repeats)"
            style={{ flex: 1, background: 'var(--surface2)', fontFamily: 'monospace', fontSize: 12, padding: '8px', borderRadius: 6, border: '1px solid var(--border2)' }}
          />
        )}
        {inputType === 'cag' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12 }}>CAG repeats:</span>
            <input type="number" min="1" max="120" value={cagCount} onChange={e => setCagCount(+e.target.value)} style={{ width: 80, background: 'var(--surface2)', padding: '4px 8px', borderRadius: 6 }} />
          </div>
        )}

        <button onClick={handleSubmit} style={{ background: 'var(--blue)', border: 'none', borderRadius: 6, padding: '8px 20px', color: 'white', alignSelf: 'center' }}>
          Fold & Analyze
        </button>
      </div>

      {error && <div style={{ background: 'rgba(226,75,74,0.1)', padding: '8px 12px', borderRadius: 6, color: '#F09595', marginBottom: 16 }}>{error}</div>}

      {submittedSeq && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
            <div className="card" style={{ padding: '8px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>PolyQ length</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: polyQLen >= 40 ? '#E24B4A' : '#1D9E75' }}>{polyQLen}</div>
            </div>
            <div className="card" style={{ padding: '8px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Protein length</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{submittedSeq.length} aa</div>
            </div>
            <div className="card" style={{ padding: '8px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Folding method</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>ESMFold (Meta)</div>
            </div>
          </div>

          {/* 3D structure viewer */}
          <ProteinViewer
            key={submittedSeq}
            cagCount={polyQLen}
            dnaSequence={null}          // we already have protein
            overrideProtein={submittedSeq}
          />

          {/* Drug interaction card – uses the same CAG count or sequence internally */}
          <DrugInteractionCard cagCount={polyQLen} proteinSequence={submittedSeq} />
        </>
      )}
    </div>
  );
} 