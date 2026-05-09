import { useState, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Cylinder, Line, Html, Text, Environment, SpotLight } from '@react-three/drei';
import * as THREE from 'three';
import axios from 'axios';

// ----------------------------------------------------------------------
// Utility functions (same as before)
// ----------------------------------------------------------------------
function lerpColor(a, b, t) {
  return a.map((c, i) => Math.round(c + (b[i] - c) * t));
}

function aggPropensity(cag) {
  if (cag <= 35) return Math.max(0, (cag - 20) * 0.003);
  if (cag <= 40) return 0.05 + (cag - 35) * 0.04;
  return Math.min(1, 0.25 + (cag - 40) * 0.022);
}

function residueColor(i, total, cag) {
  const t = i / Math.max(1, total - 1);
  const agg = aggPropensity(cag);
  if (cag <= 35) return lerpColor([29, 158, 117], [29, 120, 90], t);
  if (cag <= 39) return lerpColor([29, 158, 117], [186, 117, 23], t);
  const danger = Math.min(1, t * agg * 3);
  return lerpColor([186, 117, 23], [226, 75, 74], danger);
}

function classify(cag) {
  if (cag <= 26) return { label: 'Normal', color: '#1D9E75', bg: 'rgba(29,158,117,0.12)' };
  if (cag <= 35) return { label: 'Normal (high)', color: '#1D9E75', bg: 'rgba(29,158,117,0.12)' };
  if (cag <= 39) return { label: 'Intermediate', color: '#BA7517', bg: 'rgba(186,117,23,0.12)' };
  if (cag <= 59) return { label: 'Full penetrance HD', color: '#E24B4A', bg: 'rgba(226,75,74,0.12)' };
  return { label: 'Juvenile-onset HD', color: '#A32D2D', bg: 'rgba(163,45,45,0.12)' };
}

// ----------------------------------------------------------------------
// 3D Helix with Residues & Backbone
// ----------------------------------------------------------------------
function HelixChain({ cag, normalCag = 20, animated = true }) {
  const groupRef = useRef();
  const { camera } = useThree();

  // Positions for each residue (dynamic when cag changes)
  const points = useMemo(() => {
    const radius = 1.4;
    const pitch = 0.45;
    const turns = cag / 3.6;
    const totalHeight = turns * pitch;
    const startY = -totalHeight / 2;

    const positions = [];
    for (let i = 0; i < cag; i++) {
      const angle = (i / 3.6) * Math.PI * 2;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      const y = startY + i * pitch;
      positions.push(new THREE.Vector3(x, y, z));
    }
    return positions;
  }, [cag]);

  // Color for each residue
  const colors = useMemo(() => {
    return points.map((_, i) => {
      const rgb = residueColor(i, cag, cag);
      return new THREE.Color(`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`);
    });
  }, [points, cag]);

  // Aggregation propensity – used for particle emission
  const agg = aggPropensity(cag);
  const isPathogenic = cag >= 40;

  // Auto‑rotate the whole group (optional)
  useFrame((state) => {
    if (animated && groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.1;
    }
  });

  // Build backbone as a CatmullRomCurve3 -> tube geometry
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(points);
  }, [points]);

  const tubeGeometry = useMemo(() => {
    const tubularSegments = Math.max(200, cag * 8);
    const radius = 0.08;
    const radialSegments = 6;
    return new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
  }, [curve, cag]);

  return (
    <group ref={groupRef}>
      {/* Backbone tube */}
      <mesh geometry={tubeGeometry} castShadow receiveShadow>
        <meshStandardMaterial color="#B5D4F4" roughness={0.3} metalness={0.6} emissive="#185FA5" emissiveIntensity={0.08} />
      </mesh>

      {/* Residue spheres */}
      {points.map((pos, i) => (
        <Sphere
          key={i}
          position={pos}
          args={[0.28, 24, 16]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={colors[i]}
            emissive={isPathogenic && i > 35 ? '#E24B4A' : '#000000'}
            emissiveIntensity={isPathogenic && i > 35 ? agg * 0.6 : 0}
            roughness={0.2}
            metalness={0.8}
          />
        </Sphere>
      ))}

      {/* Glowing particle system – aggregation clusters */}
      {isPathogenic && agg > 0.3 && (
        <AggregationParticles cag={cag} positions={points} agg={agg} />
      )}
    </group>
  );
}

// ----------------------------------------------------------------------
// Particle system for aggregation
// ----------------------------------------------------------------------
function AggregationParticles({ cag, positions, agg }) {
  const particleCount = Math.min(300, Math.floor((cag - 39) * 5));
  const particlePositions = useMemo(() => {
    const points = [];
    for (let i = 0; i < particleCount; i++) {
      // Pick a random residue (skew toward C‑terminal)
      const idx = Math.floor(Math.pow(Math.random(), 1.5) * positions.length);
      const basePos = positions[idx];
      // Random offset around the residue
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 1.2
      );
      points.push(basePos.clone().add(offset));
    }
    return points;
  }, [cag, positions]);

  return (
    <group>
      {particlePositions.map((pos, i) => (
        <Sphere key={i} position={pos} args={[0.06, 6, 6]}>
          <meshStandardMaterial color="#E24B4A" emissive="#E24B4A" emissiveIntensity={0.8 * agg} />
        </Sphere>
      ))}
    </group>
  );
}

// ----------------------------------------------------------------------
// Interactive Control Panel
// ----------------------------------------------------------------------
function ControlPanel({ cag, setCag, showSplit, setShowSplit, aggregated }) {
  const cls = classify(cag);
  return (
    <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, zIndex: 10, pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto', background: 'var(--surface, #111318)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border, #2a2e3a)', backdropFilter: 'blur(8px)' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim, #888)', marginBottom: 6 }}>CAG repeat length</div>
            <input
              type="range"
              min={6}
              max={80}
              step={1}
              value={cag}
              onChange={e => setCag(+e.target.value)}
              style={{ width: '100%', background: '#1a1e2a', accentColor: '#185FA5' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
              <span>6</span>
              <span style={{ color: cls.color, fontWeight: 600 }}>{cag} – {cls.label}</span>
              <span>80</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'var(--mono, monospace)', color: cls.color }}>{cag}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim, #888)' }}>repeats</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, justifyContent: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <input type="checkbox" checked={showSplit} onChange={e => setShowSplit(e.target.checked)} />
            Show normal reference (CAG 20)
          </label>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim, #888)', marginTop: 10, borderTop: '1px solid var(--border, #2a2e3a)', paddingTop: 10 }}>
          Aggregation propensity: <strong style={{ color: aggregated > 0.5 ? '#E24B4A' : '#1D9E75' }}>{(aggregated * 100).toFixed(1)}%</strong>
          {cag >= 40 && ' – β‑sheet formation, toxic oligomers present'}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export default function ProteinPage() {
  const [cag, setCag] = useState(24);
  const [showSplit, setShowSplit] = useState(false);
  const [aggregated, setAggregated] = useState(0);
  const [loading, setLoading] = useState(false);

  // Update aggregation score from backend (optional)
  useState(() => {
    const fetchAgg = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/htt/protein/structure', { params: { cag } });
        setAggregated(res.data.aggregation_score);
      } catch {
        setAggregated(aggPropensity(cag));
      }
      setLoading(false);
    };
    fetchAgg();
  }, [cag]);

  return (
    <div style={{ height: 'calc(100vh - 80px)', minHeight: 600, position: 'relative', background: '#05070a', borderRadius: 16, overflow: 'hidden' }}>
      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [6, 5, 8], fov: 45 }}
        style={{ background: '#05070a' }}
      >
        <ambientLight intensity={0.3} />
        <SpotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-5, 5, 5]} intensity={0.5} />
        <pointLight position={[0, 5, 0]} intensity={0.2} color="#B5D4F4" />

        <HelixChain cag={cag} normalCag={20} animated={!showSplit} />

        {/* Optional ground grid */}
        <gridHelper args={[20, 20, '#334', '#223']} position={[0, -3.5, 0]} />

        <OrbitControls
          enableZoom
          enablePan
          zoomSpeed={1.2}
          rotateSpeed={1.0}
          autoRotate={!showSplit}
          autoRotateSpeed={0.8}
        />
        <Environment preset="night" />
      </Canvas>

      {/* Control overlay */}
      <ControlPanel cag={cag} setCag={setCag} showSplit={showSplit} setShowSplit={setShowSplit} aggregated={aggregated} />

      {/* Optionally show the normal helices side-by-side */}
      {showSplit && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 180,
          height: 180,
          background: 'rgba(0,0,0,0.7)',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #2a2e3a',
          pointerEvents: 'none',
          zIndex: 20
        }}>
          <Canvas camera={{ position: [5, 4, 6], fov: 50 }}>
            <ambientLight intensity={0.4} />
            <pointLight position={[5, 5, 5]} />
            <HelixChain cag={20} animated={false} />
            <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
          </Canvas>
          <div style={{ position: 'absolute', bottom: 4, left: 8, fontSize: 10, color: '#1D9E75' }}>Normal (CAG 20)</div>
        </div>
      )}
    </div>
  );
}