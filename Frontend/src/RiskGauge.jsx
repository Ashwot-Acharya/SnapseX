export default function RiskGauge({ data }) {
  const risk   = Math.min(1, Math.max(0, data.anomaly_score || 0));
  const color  = risk > 0.7 ? '#E24B4A' : risk > 0.3 ? '#BA7517' : '#1D9E75';
  const desc   = risk > 0.7 ? 'High risk — pathogenic expansion'
               : risk > 0.3 ? 'Moderate risk — reduced penetrance'
               : 'Low risk — likely healthy allele';

  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - risk * circ;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <p className="card-label" style={{ alignSelf: 'flex-start' }}>Risk score</p>

      {/* Circular ring */}
      <div style={{ position: 'relative', width: 104, height: 104 }}>
        <svg width="104" height="104" viewBox="0 0 104 104" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="52" cy="52" r={r} fill="none" stroke="var(--surface2)" strokeWidth="8" />
          <circle
            cx="52" cy="52" r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.7s ease-out, stroke 0.4s' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 500, color }}>
            {Math.round(risk * 100)}%
          </span>
        </div>
      </div>

      {/* Gradient band */}
      <div style={{ width: 130, position: 'relative' }}>
        <div style={{ height: 5, borderRadius: 3, background: 'linear-gradient(to right, #1D9E75, #BA7517, #E24B4A)' }} />
        <div style={{
          position: 'absolute',
          left: `${Math.round(risk * 100)}%`,
          top: -4,
          width: 12, height: 12,
          borderRadius: '50%',
          background: 'var(--surface)',
          border: `2px solid ${color}`,
          transform: 'translateX(-50%)',
          transition: 'left 0.5s ease-out',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: 130, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: -6 }}>
        <span>low</span><span>mod</span><span>high</span>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', maxWidth: 160, lineHeight: 1.5 }}>
        {desc}
      </p>
    </div>
  );
}