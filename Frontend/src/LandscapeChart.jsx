import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot } from 'recharts';
import { getLandscape } from './api';

export default function LandscapeChart({ highlightCAG }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    getLandscape('fitness').then(res => setData(res.points));
  }, []);

  // Color by classification
  const coloredData = data.map(d => ({ ...d, color: d.color }));

  return (
    <div style={{ margin: '1rem 0' }}>
      <h3>Fitness Landscape (Cellular)</h3>
      <LineChart width={800} height={300} data={coloredData} margin={{ top: 20, right: 30 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="cag" label={{ value: 'CAG repeats', position: 'insideBottom', offset: -5 }} />
        <YAxis domain={[0,1]} label={{ value: 'Fitness', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Line type="monotone" dataKey="fitness" stroke="#8884d8" strokeWidth={2} dot={false} />
        {/* Threshold lines */}
        <ReferenceLine x={35} stroke="orange" strokeDasharray="5 5" label="Normal max" />
        <ReferenceLine x={40} stroke="red" strokeDasharray="5 5" label="Full penetrance" />
        <ReferenceLine x={60} stroke="purple" strokeDasharray="5 5" label="Juvenile" />
        {highlightCAG && (
          <ReferenceDot x={highlightCAG} y={data.find(d=>d.cag===highlightCAG)?.fitness} r={6} fill="red" stroke="none" />
        )}
      </LineChart>
    </div>
  );
}