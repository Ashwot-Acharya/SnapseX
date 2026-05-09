import { useState } from 'react';
import axios from 'axios';
import DetectionResult from './DetectionResult';
import RiskGauge from './RiskGauge';

export default function ComparePage() {
  const [inputType, setInputType] = useState('cag');
  const [cagValue, setCagValue] = useState(45);
  const [sequenceValue, setSequenceValue] = useState('');
  const [compareData, setCompareData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    setLoading(true);
    try {
      const payload = inputType === 'cag'
        ? { cag_count: cagValue }
        : { sequence: sequenceValue };
      const res = await axios.post('/api/htt/compare', payload);
      setCompareData(res.data);
    } catch (err) {
      alert('Comparison failed: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <p className="card-label">Sequence vs Reference (wild‑type)</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <select value={inputType} onChange={e => setInputType(e.target.value)} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 6, padding: '6px 12px' }}>
          <option value="cag">CAG count</option>
          <option value="sequence">DNA sequence</option>
        </select>
        {inputType === 'cag' ? (
          <input type="number" value={cagValue} onChange={e => setCagValue(+e.target.value)} min={1} max={200} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 6, padding: '6px 12px', width: 100 }} />
        ) : (
          <textarea rows={2} value={sequenceValue} onChange={e => setSequenceValue(e.target.value)} placeholder="Paste DNA sequence..." style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 6, padding: '6px 12px', width: 300, fontFamily: 'monospace' }} />
        )}
        <button onClick={handleCompare} disabled={loading} style={{ background: 'var(--blue)', border: 'none', borderRadius: 6, padding: '6px 18px', color: 'white' }}>
          {loading ? 'Comparing…' : 'Compare'}
        </button>
      </div>

      {compareData && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div className="card" style={{ padding: '12px 16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Reference (wild‑type)</h4>
              <div><strong>CAG repeats:</strong> {compareData.reference_cag}</div>
              <div><strong>Classification:</strong> normal</div>
              <div><strong>PolyQ length:</strong> {compareData.reference_cag}</div>
            </div>
            <div className="card" style={{ padding: '12px 16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Input sample</h4>
              <div><strong>CAG repeats:</strong> {compareData.detection_result.cag_count}</div>
              <div><strong>Classification:</strong> {compareData.detection_result.classification.cls}</div>
              <div><strong>Difference:</strong> {compareData.comparison.cag_difference >= 0 ? '+' : ''}{compareData.comparison.cag_difference}</div>
              {compareData.comparison.interruptions.length > 0 && <div><strong>Interruptions:</strong> {compareData.comparison.interruptions.join(', ')}</div>}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <p className="card-label">Protein change (polyQ region)</p>
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '12px', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <div style={{ color: 'var(--text-dim)', marginBottom: 6 }}>Normal (CAG {compareData.reference_cag}):</div>
              <div>{compareData.normal_protein.substring(0, 80)}…</div>
              <div style={{ marginTop: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Mutated (CAG {compareData.detection_result.cag_count}):</div>
              <div>{compareData.mutated_protein.substring(0, 80)}…</div>
            </div>
            <p className="mono" style={{ fontSize: 11, marginTop: 12 }}>The polyQ stretch length changes from {compareData.reference_cag} to {compareData.detection_result.cag_count} residues. Longer polyQ increases aggregation propensity and alters protein function.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            <DetectionResult data={compareData.detection_result} />
            <RiskGauge data={compareData.detection_result} />
          </div>
        </div>
      )}
    </div>
  );
}