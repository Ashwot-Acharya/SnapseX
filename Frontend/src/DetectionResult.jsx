import { AlertTriangle, CheckCircle, Dna } from 'lucide-react';

function Metric({ label, value, color }) {
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 500, color: color || 'var(--text-head)' }}>
        {value}
      </div>
    </div>
  );
}

export default function DetectionResult({ data, label }) {
  const {
    parse_success,
    cag_count,
    normalized_score,
    anomaly_score,
    classification,
    onset_prediction,
    flanks_intact,
    interruptions,
  } = data;

  const isMutant = cag_count >= 40 || anomaly_score > 0.3;
  const statusColor  = isMutant ? '#E24B4A' : '#1D9E75';
  const statusBg     = isMutant ? 'rgba(162,45,45,0.12)' : 'rgba(29,158,117,0.1)';
  const statusBorder = isMutant ? 'rgba(226,75,74,0.25)' : 'rgba(29,158,117,0.25)';

  return (
    <div className="card" style={{ outline: isMutant ? '1px solid rgba(226,75,74,0.2)' : 'none' }}>
      <p className="card-label">{label || 'Detection result'}</p>

      {/* Status banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: statusBg, border: `1px solid ${statusBorder}`,
        borderRadius: 8, padding: '9px 13px', marginBottom: 16,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: statusColor }}>
          {isMutant ? 'Pathogenic expansion detected' : 'No pathogenic expansion'}
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginLeft: 'auto' }}>
          CAG = {cag_count}
        </span>
        {classification?.cls && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)' }}>
            {classification.cls.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
        <Metric
          label="Health score"
          value={normalized_score.toFixed(3)}
          color={normalized_score > 0.7 ? '#1D9E75' : '#E24B4A'}
        />
        <Metric
          label="Anomaly"
          value={anomaly_score.toFixed(3)}
          color={anomaly_score < 0.3 ? '#1D9E75' : '#E24B4A'}
        />
        <Metric
          label="Flanks"
          value={flanks_intact ? '✓ Intact' : '✗ Disrupted'}
          color={flanks_intact ? '#1D9E75' : '#E24B4A'}
        />
        <Metric
          label="Onset est."
          value={onset_prediction?.median_onset ? `${onset_prediction.median_onset} yrs` : 'N/A'}
        />
      </div>

      {/* Interruptions */}
      {interruptions?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 5 }}>
            Interruptions
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {interruptions.map(i => (
              <span key={i} style={{
                fontFamily: 'var(--mono)', fontSize: 11,
                background: 'rgba(162,45,45,0.2)', color: '#F09595',
                padding: '2px 8px', borderRadius: 4,
              }}>{i}</span>
            ))}
          </div>
        </div>
      )}

      {/* CFG parse stamp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: parse_success ? '#1D9E75' : '#E24B4A', flexShrink: 0 }} />
        CFG parse {parse_success ? 'successful' : 'failed — grammar rules violated'}
      </div>
    </div>
  );
}