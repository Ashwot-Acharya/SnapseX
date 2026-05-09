import { useState } from 'react';
import Header         from './Navbar';
import InputCard      from './InputCard';
import DetectionResult from './DetectionResult';
import LandscapeCard  from './LandscapeCard';
import GeneNetwork    from './GeneNetwork';
import ParseTreeCard  from './ParseTreeCard';
import RiskGauge      from './RiskGauge';
import PedigreeCard   from './HeredityPage';

function DetectorPage() {
  const [result,         setResult]         = useState(null);
  const [cag,            setCag]            = useState(null);
  const [dnaSequence,    setDnaSequence]    = useState('');
  const [compareResult,  setCompareResult]  = useState(null);
  const [compareCag,     setCompareCag]     = useState(null);
  const [showComparison, setShowComparison] = useState(false);

  const handleResult = (res) => { setResult(res); setCag(res.cag_count); };

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <main style={{ flex: 1, maxWidth: 1200, margin: '0 auto', padding: '28px 20px 60px', width: '100%' }}>
        <InputCard onResult={handleResult} setCag={setCag} onSequenceChange={setDnaSequence} />

        {result && (
          <div style={{ marginTop: 12 }}>
            <button onClick={() => setShowComparison(v => !v)}
              style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, padding: 0 }}>
              {showComparison ? '— hide comparison' : '+ compare another allele'}
            </button>
            {showComparison && (
              <div style={{ marginTop: 10 }}>
                <InputCard onResult={setCompareResult} setCag={setCompareCag} label="Comparison allele" />
              </div>
            )}
          </div>
        )}

        {result && (
          <div style={{ marginTop: 24, display: 'grid', gap: 14, gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
            <DetectionResult data={result} />
            <RiskGauge data={result} />
            <div style={{ gridColumn: '1 / -1' }}><LandscapeCard highlightCAG={cag} comparisonCAG={compareCag} /></div>
            <div style={{ gridColumn: '1 / -1' }}><GeneNetwork cag={cag} /></div>
            <PedigreeCard cagCount={cag} />
            <ParseTreeCard parseTree={result.parse_tree} />
            {compareResult && <DetectionResult data={compareResult} label="Comparison allele" />}
          </div>
        )}
      </main>
    </div>
  );
}

export default DetectorPage;