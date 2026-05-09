import { useState } from 'react';
import { detectByCAG, detectMutation } from './api';

const ZONES = [
  { label: 'Normal',        max: 35,  color: '#1D9E75' },
  { label: 'Intermediate',  max: 39,  color: '#BA7517' },
  { label: 'Full penetrance', max: 59, color: '#E24B4A' },
  { label: 'Juvenile',      max: 200, color: '#A32D2D' },
];

function classifyCAG(n) {
  if (n <= 26)  return { label: 'Normal',                  color: '#1D9E75' };
  if (n <= 35)  return { label: 'Normal (high)',            color: '#1D9E75' };
  if (n <= 39)  return { label: 'Intermediate',             color: '#BA7517' };
  if (n <= 59)  return { label: 'Full penetrance HD',       color: '#E24B4A' };
  return        { label: 'Juvenile-onset HD',               color: '#A32D2D' };
}

function CAGTrack({ value }) {
  const pct = ((Math.min(200, Math.max(1, value)) - 1) / 199) * 100;
  const cls = classifyCAG(value);
  return (
    <div style={{ marginTop: 18 }}>
      {/* Zone bar */}
      <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: '0%',    width: '17.5%', top: 0, bottom: 0, background: '#1D9E75', opacity: 0.35 }} />
        <div style={{ position: 'absolute', left: '17.5%', width: '2.5%',  top: 0, bottom: 0, background: '#BA7517', opacity: 0.45 }} />
        <div style={{ position: 'absolute', left: '20%',   width: '10%',   top: 0, bottom: 0, background: '#E24B4A', opacity: 0.4  }} />
        <div style={{ position: 'absolute', left: '30%',   width: '70%',   top: 0, bottom: 0, background: '#A32D2D', opacity: 0.35 }} />
      </div>
      {/* Pointer */}
      <div style={{ position: 'relative', height: 14 }}>
        <div style={{
          position: 'absolute',
          left: `${pct}%`,
          top: -10,
          width: 12, height: 12,
          borderRadius: '50%',
          background: 'var(--surface)',
          border: `2px solid ${cls.color}`,
          transform: 'translateX(-50%)',
          transition: 'left 0.2s',
        }} />
      </div>
      {/* Axis labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
        <span>1</span><span>35</span><span>40</span><span>60</span><span>200</span>
      </div>
      {/* Zone legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
        {ZONES.map(z => (
          <span key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-dim)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: z.color, display: 'inline-block' }} />
            {z.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function InputCard({ onResult, setCag, label = 'Analyse Sequence' }) {
  const [tab, setTab]         = useState('cag');
  const [cagInput, setCagInput] = useState(45);
  const [seqInput, setSeqInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleDetect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = tab === 'cag'
        ? await detectByCAG(Number(cagInput))
        : await detectMutation(seqInput);
      onResult(res);
      setCag(res.cag_count);
    } catch {
      setError('Connection failed – is Flask running on port 5000?');
    }
    setLoading(false);
  };

  const cls = classifyCAG(Number(cagInput));

  const tabStyle = (active) => ({
    padding: '6px 16px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: active ? 500 : 400,
    cursor: 'pointer',
    border: active ? '1px solid var(--border2)' : '1px solid transparent',
    background: active ? 'var(--surface)' : 'transparent',
    color: active ? 'var(--text-head)' : 'var(--text-dim)',
    transition: 'all 0.15s',
    fontFamily: 'var(--sans)',
  });

  const btnStyle = {
    background: 'var(--blue)',
    color: 'var(--blue-lt)',
    border: 'none',
    borderRadius: 7,
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 500,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    fontFamily: 'var(--sans)',
    transition: 'opacity 0.15s',
  };

  return (
    <div className="card">
      <p className="card-label">{label}</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', borderRadius: 8, padding: 3, width: 'fit-content', marginBottom: 18 }}>
        <button style={tabStyle(tab === 'cag')}      onClick={() => setTab('cag')}>CAG count</button>
        <button style={tabStyle(tab === 'sequence')} onClick={() => setTab('sequence')}>DNA sequence</button>
      </div>

      {tab === 'cag' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 5, fontFamily: 'var(--mono)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                Repeats
              </div>
              <input
                type="number"
                value={cagInput}
                onChange={e => setCagInput(e.target.value)}
                min={1} max={200}
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border2)',
                  borderRadius: 7,
                  padding: '7px 12px',
                  color: 'var(--text-head)',
                  fontFamily: 'var(--mono)',
                  fontSize: 14,
                  width: 80,
                  outline: 'none',
                }}
              />
            </div>
            <button onClick={handleDetect} disabled={loading} style={{ ...btnStyle, marginTop: 19 }}>
              {loading && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.7s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                </svg>
              )}
              {loading ? 'Analysing…' : 'Analyse'}
            </button>
            {!loading && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: cls.color, marginTop: 20 }}>
                {cls.label}
              </span>
            )}
          </div>
          <CAGTrack value={Number(cagInput)} />
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            rows={3}
            value={seqInput}
            onChange={e => setSeqInput(e.target.value)}
            placeholder="Paste HTT exon 1 DNA sequence (ATGCAG…)"
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border2)',
              borderRadius: 7,
              padding: '10px 12px',
              color: 'var(--text-head)',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              resize: 'none',
              outline: 'none',
              width: '100%',
            }}
          />
          <button onClick={handleDetect} disabled={loading} style={{ ...btnStyle, alignSelf: 'flex-start' }}>
            {loading ? 'Detecting…' : 'Detect mutation'}
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 14, background: 'rgba(162,45,45,0.15)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 7, padding: '8px 12px', fontSize: 12, color: '#F09595', fontFamily: 'var(--mono)' }}>
          {error}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}