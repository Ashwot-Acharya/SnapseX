import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceDot, ResponsiveContainer,
} from 'recharts';
import { getLandscape } from './api';

const ZONE_COLORS = { normal: '#1D9E75', intermediate: '#BA7517', full: '#E24B4A', juvenile: '#A32D2D' };

function zoneColor(cag) {
  if (cag <= 35) return ZONE_COLORS.normal;
  if (cag <= 39) return ZONE_COLORS.intermediate;
  if (cag <= 59) return ZONE_COLORS.full;
  return ZONE_COLORS.juvenile;
}

const CustomDot = ({ cx, cy, payload, highlightCAG, comparisonCAG }) => {
  const isHL  = payload.cag === highlightCAG;
  const isCMP = payload.cag === comparisonCAG;
  if (!isHL && !isCMP) return null;
  return <circle cx={cx} cy={cy} r={6} fill={isHL ? '#E24B4A' : '#185FA5'} stroke="var(--surface)" strokeWidth={2} />;
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { cag, fitness } = payload[0].payload;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 7, padding: '7px 11px', fontFamily: 'var(--mono)', fontSize: 12 }}>
      <div style={{ color: 'var(--text-dim)' }}>CAG <span style={{ color: 'var(--text-head)' }}>{cag}</span></div>
      <div style={{ color: 'var(--text-dim)' }}>fitness <span style={{ color: zoneColor(cag) }}>{fitness?.toFixed(3)}</span></div>
    </div>
  );
};

export default function LandscapeCard({ highlightCAG, comparisonCAG }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    getLandscape('fitness').then(res => setData(res.points));
  }, []);

  const refLineLabel = (val, color) => ({
    value: String(val),
    position: 'insideTopRight',
    fill: color,
    fontSize: 10,
    fontFamily: 'var(--mono)',
  });

  return (
    <div className="card">
      <p className="card-label">Fitness landscape</p>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>Cellular fitness across CAG repeat length</p>

      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="cag" stroke="var(--text-dim)" tick={{ fontSize: 11, fontFamily: 'var(--mono)' }} />
            <YAxis domain={[0, 1]} stroke="var(--text-dim)" tick={{ fontSize: 11, fontFamily: 'var(--mono)' }} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="fitness"
              stroke="#185FA5"
              strokeWidth={2}
              dot={<CustomDot highlightCAG={highlightCAG} comparisonCAG={comparisonCAG} />}
              activeDot={{ r: 4, fill: '#B5D4F4' }}
              name="Fitness"
            />
            <ReferenceLine x={35} stroke={ZONE_COLORS.normal}       strokeDasharray="4 4" label={refLineLabel(35, ZONE_COLORS.normal)} />
            <ReferenceLine x={40} stroke={ZONE_COLORS.intermediate} strokeDasharray="4 4" label={refLineLabel(40, ZONE_COLORS.intermediate)} />
            <ReferenceLine x={60} stroke={ZONE_COLORS.juvenile}     strokeDasharray="4 4" label={refLineLabel(60, ZONE_COLORS.juvenile)} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Normal ≤35',       color: ZONE_COLORS.normal },
          { label: 'Intermediate',     color: ZONE_COLORS.intermediate },
          { label: 'Full penetrance',  color: ZONE_COLORS.full },
          { label: 'Juvenile ≥60',     color: ZONE_COLORS.juvenile },
        ].map(z => (
          <span key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-dim)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: z.color, display: 'inline-block' }} />
            {z.label}
          </span>
        ))}
        {highlightCAG && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-dim)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E24B4A', display: 'inline-block' }} />
            CAG {highlightCAG}
          </span>
        )}
        {comparisonCAG && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-dim)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#185FA5', display: 'inline-block' }} />
            Comparison {comparisonCAG}
          </span>
        )}
      </div>
    </div>
  );
}