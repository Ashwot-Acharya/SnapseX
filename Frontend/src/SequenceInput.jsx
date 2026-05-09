import { useState } from 'react';
import { detectMutation, detectByCAG } from './api';

export default function SequenceInput({ onResult, setCag }) {
  const [mode, setMode] = useState('cag'); // 'cag' or 'sequence'
  const [cagInput, setCagInput] = useState(45);
  const [seqInput, setSeqInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDetect = async () => {
    setLoading(true);
    try {
      let res;
      if (mode === 'cag') {
        res = await detectByCAG(Number(cagInput));
      } else {
        res = await detectMutation(seqInput);
      }
      onResult(res);
      setCag(res.cag_count);          // so landscape can highlight this CAG
    } catch (e) {
      alert('API error – is Flask running on port 5000?');
    }
    setLoading(false);
  };

  return (
    <div style={{ margin: '1rem 0' }}>
      <label>
        <input type="radio" checked={mode==='cag'} onChange={()=>setMode('cag')} />
        Enter CAG count (demo)
      </label>
      <label>
        <input type="radio" checked={mode==='sequence'} onChange={()=>setMode('sequence')} />
        Paste DNA sequence
      </label>

      {mode === 'cag' ? (
        <input type="number" value={cagInput} onChange={e=>setCagInput(e.target.value)} min={1} max={200} />
      ) : (
        <textarea rows={3} cols={60} value={seqInput} onChange={e=>setSeqInput(e.target.value)} placeholder="ATGCAG..." />
      )}

      <button onClick={handleDetect} disabled={loading}>
        {loading ? 'Analyzing...' : 'Detect Mutation'}
      </button>
    </div>
  );
}