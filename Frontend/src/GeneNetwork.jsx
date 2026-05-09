import { useEffect, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { getInteractions } from './api';

function computeExpression(nodeId, cag) {
  if (cag < 40) return 1.0;
  const severity = Math.min((cag - 39) / 30, 1);
  switch (nodeId) {
    case 'BDNF': return Math.max(0.1, 1 - severity * 0.9);
    case 'CBP':  return Math.max(0.1, 1 - severity * 0.85);
    case 'REST': return Math.max(0.1, 1 - severity * 0.7);
    case 'TP53': return Math.min(1.5, 1 + severity * 0.5);
    case 'CASP3':return Math.min(1.7, 1 + severity * 0.7);
    default:     return 1.0;
  }
}

function exprColor(expr, dir) {
  if (dir === 'up' && expr > 1) return '#E24B4A';
  if (expr >= 0.9) return '#1D9E75';
  if (expr >= 0.5) return '#BA7517';
  return '#E24B4A';
}

const GENES = [
  { id: 'BDNF',  dir: 'down', note: 'Neuroprotection' },
  { id: 'CBP',   dir: 'down', note: 'Transcription co-activator' },
  { id: 'REST',  dir: 'down', note: 'Neuronal gene repressor' },
  { id: 'TP53',  dir: 'up',   note: 'Apoptosis regulator' },
  { id: 'CASP3', dir: 'up',   note: 'Executioner caspase' },
];

export default function GeneNetwork({ cag, className = '' }) {
  const [graphData, setGraphData]   = useState({ nodes: [], links: [] });
  const [showGraph, setShowGraph]   = useState(false);

  useEffect(() => {
    getInteractions().then(setGraphData);
  }, []);

  const nodeColor = useCallback(node => {
    const e = computeExpression(node.id, cag);
    return e >= 0.9 ? '#1D9E75' : e >= 0.5 ? '#BA7517' : '#E24B4A';
  }, [cag]);

  const nodeVal = useCallback(node => {
    return 5 + computeExpression(node.id, cag) * 5;
  }, [cag]);

  return (
    <div className={`card ${className}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <p className="card-label" style={{ margin: 0 }}>Gene expression impact</p>
        <button
          onClick={() => setShowGraph(v => !v)}
          style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', background: 'none', border: '1px solid var(--border2)', borderRadius: 5, padding: '3px 9px', cursor: 'pointer', letterSpacing: '0.4px' }}
        >
          {showGraph ? 'BARS' : 'NETWORK'}
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>Effect of mutant HTT on protein partners</p>

      {showGraph ? (
        <div style={{ width: '100%', height: 280, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <ForceGraph2D
            graphData={graphData}
            nodeColor={nodeColor}
            nodeVal={nodeVal}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            linkCurvature={0.25}
            backgroundColor="var(--surface2)"
            nodeLabel={node => `${node.id} — expr: ${computeExpression(node.id, cag).toFixed(2)}`}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px monospace`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#c9cdd6';
              ctx.fillText(node.id, node.x, node.y + 10);
            }}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {GENES.map(g => {
            const expr  = computeExpression(g.id, cag);
            const color = exprColor(expr, g.dir);
            const barW  = Math.min(100, Math.abs(expr - (g.dir === 'up' ? 0 : 0)) * 66);
            return (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500, width: 44, flexShrink: 0, color: 'var(--text-head)' }}>
                  {g.id}
                </span>
                <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, expr * 60)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s' }} />
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color, width: 38, textAlign: 'right' }}>
                  {expr.toFixed(2)}×
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', width: 170, flexShrink: 0 }}>
                  {g.note}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
        {[['#1D9E75','Normal'],['#BA7517','Moderate'],['#E24B4A','Severe / upregulated']].map(([c,l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-dim)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}