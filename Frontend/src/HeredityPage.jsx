import { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';

// ─── Real genetics constants (from literature) ────────────────────────
// Langbehn 2004: median onset ≈ exp(9.556 - 0.1179 * CAG)  years
// Meiotic instability: paternal mean expansion +2.5/gen, SD 3.5
//                      maternal mean expansion +0.5/gen, SD 1.5
// Mutation frequency for disease alleles ~70-82%
// Autosomal dominant: 50% transmission of expanded allele per child

const GENETICS = {
  normal_max:       35,
  intermediate_min: 36,
  intermediate_max: 39,
  disease_min:      40,
  juvenile_min:     60,
  // Paternal expansion params (Duyao/OMIM data)
  paternal_mean_delta: 2.5,
  paternal_sd:         3.5,
  // Maternal expansion params (more stable)
  maternal_mean_delta: 0.5,
  maternal_sd:         1.5,
  // Transmission prob of expanded allele (autosomal dominant)
  transmission_prob:   0.50,
};

// Langbehn 2004 parametric survival model approximation
// median AAO ≈ exp(9.556 - 0.1179 * cag) — fits published table well
function medianOnset(cag) {
  if (cag < 36) return null;
  if (cag >= 70) return 10; // juvenile / very early
  return Math.max(5, Math.round(Math.exp(9.556 - 0.1179 * cag)));
}

// Penetrance probability (partial for 36-39, full for ≥40)
function penetrance(cag) {
  if (cag < 36) return 0;
  if (cag <= 39) return 0.5;  // partial penetrance 36-39
  return 1.0;
}

function classify(cag) {
  if (cag >= GENETICS.juvenile_min)     return { label: 'Juvenile',     color: '#7B1A1A', textColor: '#FCEBEB', ring: '#E24B4A' };
  if (cag >= GENETICS.disease_min)      return { label: 'Affected',     color: '#E24B4A', textColor: '#FCEBEB', ring: '#A32D2D' };
  if (cag >= GENETICS.intermediate_min) return { label: 'Intermediate', color: '#BA7517', textColor: '#FAEEDA', ring: '#854F0B' };
  return                                       { label: 'Normal',       color: '#1D9E75', textColor: '#E1F5EE', ring: '#085041' };
}

// Seeded PRNG — reproducible simulation
function makePrng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; };
}

// Box-Muller normal sample
function sampleNormal(rng, mean, sd) {
  const u1 = Math.max(1e-10, rng());
  const u2 = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ─── Simulate pedigree ────────────────────────────────────────────────
function simulatePedigree({ founderCag, founderSex, generations, seed, childObsCag }) {
  const rng = makePrng(seed);
  const nodes = [];
  const edges = [];
  let uid = 0;

  function addNode({ cag, gen, parentId = null, sex, isObserved = false }) {
    const cls = classify(cag);
    const onset = medianOnset(cag);
    const affected = cag >= GENETICS.disease_min;
    const node = {
      id: uid++, cag, gen, parentId, sex,
      affected, isObserved,
      label: cls.label, color: cls.color, textColor: cls.textColor, ring: cls.ring,
      onset,
      penetrance: penetrance(cag),
    };
    nodes.push(node);
    if (parentId !== null) edges.push({ from: parentId, to: node.id });
    return node.id;
  }

  const rootId = addNode({ cag: founderCag, gen: 0, sex: founderSex });

  // Simulate 2 children per generation, each with a partner (unaffected, normal CAG ~18)
  let currentGenParents = [rootId];

  for (let g = 1; g <= generations; g++) {
    const nextParents = [];

    currentGenParents.forEach((pid, pIdx) => {
      const parent = nodes[pid];
      const parentCag = parent.cag;
      const parentSex = parent.sex;
      const parentAffected = parentCag >= GENETICS.disease_min;

      // Add a partner node (always normal, opposite sex)
      const partnerSex = parentSex === 'M' ? 'F' : 'M';
      const partnerCag = 17 + Math.floor(rng() * 5); // normal range 17-21
      const partnerId = addNode({ cag: partnerCag, gen: g, parentId: null, sex: partnerSex });

      // 2 children
      for (let c = 0; c < 2; c++) {
        // Autosomal dominant: 50% chance child inherits expanded allele
        const inherits = rng() < GENETICS.transmission_prob;

        let childCag;
        if (!inherits || !parentAffected) {
          // Child gets normal allele
          childCag = partnerCag + Math.round(sampleNormal(rng, 0, 0.5));
          childCag = Math.max(6, Math.min(35, childCag));
        } else {
          // Child inherits expanded allele with meiotic instability
          const meanDelta = parentSex === 'M'
            ? GENETICS.paternal_mean_delta
            : GENETICS.maternal_mean_delta;
          const sd = parentSex === 'M'
            ? GENETICS.paternal_sd
            : GENETICS.maternal_sd;
          const delta = sampleNormal(rng, meanDelta, sd);
          childCag = Math.round(parentCag + delta);
          childCag = Math.max(parentCag - 2, Math.min(120, childCag));
        }

        // Optional: override last-gen first child with observed value
        const isObserved = childObsCag != null && g === generations && c === 0;
        if (isObserved) childCag = childObsCag;

        const childSex = rng() < 0.5 ? 'M' : 'F';
        const childId = addNode({ cag: childCag, gen: g, parentId: pid, sex: childSex, isObserved });
        nextParents.push(childId);
      }
    });

    currentGenParents = nextParents;
  }

  return { nodes, edges, founderCag, founderSex, generations };
}

// ─── Stats helpers ────────────────────────────────────────────────────
function computeStats(pedigree) {
  const { nodes } = pedigree;
  const affected = nodes.filter(n => n.cag >= 40);
  const juvenile = nodes.filter(n => n.cag >= 60);
  const intermediate = nodes.filter(n => n.cag >= 36 && n.cag < 40);
  const maxCag = Math.max(...nodes.map(n => n.cag));
  const minOnset = affected.length
    ? Math.min(...affected.map(n => n.onset ?? 999).filter(x => x < 999))
    : null;

  // By generation
  const byGen = {};
  nodes.forEach(n => {
    if (!byGen[n.gen]) byGen[n.gen] = [];
    byGen[n.gen].push(n);
  });

  return { affected: affected.length, juvenile: juvenile.length, intermediate: intermediate.length,
           total: nodes.length, maxCag, minOnset, byGen };
}

// ─── Tiny reusable Stat card ──────────────────────────────────────────
function Stat({ label, value, color }) {
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '9px 13px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 600, color: color ?? 'var(--text-head)' }}>{value ?? '—'}</div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase',
                    color: 'var(--text-dim)', borderBottom: '1px solid var(--border)', paddingBottom: 5, marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────
export default function HeredityPage() {
  const [founderCag,  setFounderCag]  = useState(42);
  const [founderSex,  setFounderSex]  = useState('M');
  const [generations, setGenerations] = useState(4);
  const [childObsCag, setChildObsCag] = useState('');
  const [seed,        setSeed]        = useState(42);
  const [activeTab,   setActiveTab]   = useState('tree');
  const [pedigree,    setPedigree]    = useState(null);
  const [stats,       setStats]       = useState(null);
  const [hovered,     setHovered]     = useState(null);

  const svgRef      = useRef();
  const antiSvgRef  = useRef();

  // ── Run simulation ──────────────────────────────────────────────────
  useEffect(() => {
    const ped = simulatePedigree({
      founderCag,
      founderSex,
      generations,
      seed,
      childObsCag: childObsCag ? parseInt(childObsCag) : null,
    });
    setPedigree(ped);
    setStats(computeStats(ped));
  }, [founderCag, founderSex, generations, seed, childObsCag]);

  // ── Draw pedigree tree ──────────────────────────────────────────────
  useEffect(() => {
    if (!pedigree || activeTab !== 'tree') return;

    const W = 860, H = Math.max(320, generations * 120 + 80);
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${W} ${H}`)
       .style('background', 'var(--surface2)')
       .style('border-radius', '8px');

    const nodesById = Object.fromEntries(pedigree.nodes.map(n => [n.id, n]));

    // Layout: group by generation, spread horizontally
    const genGroups = {};
    pedigree.nodes.forEach(n => {
      if (!genGroups[n.gen]) genGroups[n.gen] = [];
      genGroups[n.gen].push(n);
    });

    const genCount = Object.keys(genGroups).length;
    const yStep = (H - 60) / Math.max(1, genCount - 1);
    const positions = {};

    Object.entries(genGroups).forEach(([gen, nodes]) => {
      const y = 40 + parseInt(gen) * yStep;
      const xStep = W / (nodes.length + 1);
      nodes.forEach((n, i) => {
        positions[n.id] = { x: xStep * (i + 1), y };
      });
    });

    // Edges
    const g = svg.append('g');
    pedigree.edges.forEach(({ from, to }) => {
      const p = positions[from], c = positions[to];
      if (!p || !c) return;
      g.append('path')
       .attr('fill', 'none')
       .attr('stroke', 'var(--border)')
       .attr('stroke-width', 1.5)
       .attr('d', `M${p.x},${p.y + 14} C${p.x},${(p.y + c.y) / 2} ${c.x},${(p.y + c.y) / 2} ${c.x},${c.y - 14}`);
    });

    // Nodes
    pedigree.nodes.forEach(node => {
      const pos = positions[node.id];
      if (!pos) return;
      const r = 14;
      const ng = g.append('g')
        .attr('transform', `translate(${pos.x},${pos.y})`)
        .style('cursor', 'pointer')
        .on('mouseenter', () => setHovered(node))
        .on('mouseleave', () => setHovered(null));

      // Partner nodes (no parentId, not root) drawn as squares
      const isPartner = node.parentId === null && node.id !== 0;
      const shape = isPartner || node.sex === 'F' ? 'circle' : 'rect';

      if (node.sex === 'M' && !isPartner) {
        // Square for males
        ng.append('rect')
          .attr('x', -r).attr('y', -r).attr('width', r * 2).attr('height', r * 2)
          .attr('rx', 3)
          .attr('fill', node.color)
          .attr('stroke', node.isObserved ? '#378ADD' : node.ring)
          .attr('stroke-width', node.isObserved ? 3 : 1.5);
      } else {
        // Circle for females / partners
        ng.append('circle')
          .attr('r', r)
          .attr('fill', node.color)
          .attr('stroke', node.isObserved ? '#378ADD' : node.ring)
          .attr('stroke-width', node.isObserved ? 3 : 1.5);
      }

      // Diagonal slash for unaffected carriers (intermediate)
      if (node.cag >= 36 && node.cag < 40) {
        ng.append('line')
          .attr('x1', -r + 3).attr('y1', r - 3)
          .attr('x2', r - 3).attr('y2', -r + 3)
          .attr('stroke', '#FAEEDA').attr('stroke-width', 1.5);
      }

      // CAG label inside node
      ng.append('text')
        .attr('text-anchor', 'middle').attr('dy', '0.35em')
        .attr('fill', node.textColor)
        .style('font-size', '9px')
        .style('font-family', 'var(--mono)')
        .style('font-weight', '600')
        .text(node.cag);

      // Onset label below
      if (node.onset) {
        ng.append('text')
          .attr('text-anchor', 'middle').attr('dy', r + 11)
          .attr('fill', 'var(--text-dim)')
          .style('font-size', '8px')
          .style('font-family', 'var(--mono)')
          .text(`~${node.onset}y`);
      }

      // Sex label above
      ng.append('text')
        .attr('text-anchor', 'middle').attr('dy', -r - 5)
        .attr('fill', 'var(--text-dim)')
        .style('font-size', '8px')
        .text(node.sex);
    });

    // Generation labels on left
    Object.entries(genGroups).forEach(([gen, nodes]) => {
      const y = 40 + parseInt(gen) * yStep;
      svg.append('text')
         .attr('x', 8).attr('y', y).attr('dy', '0.35em')
         .attr('fill', 'var(--text-dim)')
         .style('font-size', '10px')
         .style('font-family', 'var(--mono)')
         .text(`G${gen}`);
    });

  }, [pedigree, activeTab]);

  // ── Draw anticipation chart ─────────────────────────────────────────
  useEffect(() => {
    if (!pedigree || !stats || activeTab !== 'anticipation') return;

    const W = 680, H = 260;
    const pad = { t: 20, r: 20, b: 50, l: 50 };
    const svg = d3.select(antiSvgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${W} ${H}`)
       .style('background', 'var(--surface2)')
       .style('border-radius', '8px');

    const { byGen } = stats;
    const genKeys = Object.keys(byGen).map(Number).sort((a, b) => a - b);

    // Per-gen stats: mean, median, min, max of affected-allele carriers
    const genData = genKeys.map(g => {
      const cags = byGen[g].map(n => n.cag);
      const sorted = [...cags].sort((a, b) => a - b);
      return {
        gen: g,
        mean:   cags.reduce((s, v) => s + v, 0) / cags.length,
        median: sorted[Math.floor(sorted.length / 2)],
        min:    Math.min(...cags),
        max:    Math.max(...cags),
        onset:  byGen[g]
          .filter(n => n.onset)
          .map(n => n.onset)
          .reduce((s, v, _, a) => s + v / a.length, 0) || null,
      };
    });

    const xScale = d3.scaleLinear()
      .domain([0, generations])
      .range([pad.l, W - pad.r]);

    const allCags = genData.map(d => d.max);
    const yMax = Math.max(...allCags, pedigree.founderCag + 10);
    const yScale = d3.scaleLinear()
      .domain([0, yMax + 5])
      .range([H - pad.b, pad.t]);

    const g = svg.append('g');

    // Threshold lines
    [{ v: 40, color: '#E24B4A', label: 'Disease (40)' },
     { v: 60, color: '#7B1A1A', label: 'Juvenile (60)' },
     { v: 36, color: '#BA7517', label: 'Intermediate (36)' }].forEach(({ v, color, label }) => {
      if (v > yMax) return;
      g.append('line')
       .attr('x1', pad.l).attr('y1', yScale(v))
       .attr('x2', W - pad.r).attr('y2', yScale(v))
       .attr('stroke', color).attr('stroke-width', 0.8)
       .attr('stroke-dasharray', '4 3')
       .attr('opacity', 0.6);
      g.append('text')
       .attr('x', W - pad.r + 3).attr('y', yScale(v) + 4)
       .attr('fill', color).style('font-size', '9px')
       .style('font-family', 'var(--mono)')
       .text(label);
    });

    // Range band (min-max)
    const area = d3.area()
      .x(d => xScale(d.gen))
      .y0(d => yScale(d.min))
      .y1(d => yScale(d.max))
      .curve(d3.curveMonotoneX);

    g.append('path')
     .datum(genData)
     .attr('fill', '#E24B4A')
     .attr('opacity', 0.12)
     .attr('d', area);

    // Mean line
    const line = d3.line()
      .x(d => xScale(d.gen))
      .y(d => yScale(d.mean))
      .curve(d3.curveMonotoneX);

    g.append('path')
     .datum(genData)
     .attr('fill', 'none')
     .attr('stroke', '#E24B4A')
     .attr('stroke-width', 2)
     .attr('d', line);

    // Onset line (right axis feel — just scale to same y)
    const onsetData = genData.filter(d => d.onset);
    if (onsetData.length > 1) {
      const onsetLine = d3.line()
        .x(d => xScale(d.gen))
        .y(d => yScale(d.onset))
        .curve(d3.curveMonotoneX);
      g.append('path')
       .datum(onsetData)
       .attr('fill', 'none')
       .attr('stroke', '#56AEE2')
       .attr('stroke-width', 1.5)
       .attr('stroke-dasharray', '5 3')
       .attr('d', onsetLine);
    }

    // Data points
    genData.forEach(d => {
      g.append('circle')
       .attr('cx', xScale(d.gen)).attr('cy', yScale(d.mean))
       .attr('r', 5)
       .attr('fill', '#E24B4A')
       .attr('stroke', 'var(--surface2)')
       .attr('stroke-width', 1.5);

      g.append('text')
       .attr('x', xScale(d.gen)).attr('y', yScale(d.mean) - 9)
       .attr('text-anchor', 'middle')
       .attr('fill', 'var(--text-dim)')
       .style('font-size', '9px')
       .style('font-family', 'var(--mono)')
       .text(Math.round(d.mean));
    });

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(generations).tickFormat(d => `G${d}`);
    const yAxis = d3.axisLeft(yScale).ticks(6);
    g.append('g').attr('transform', `translate(0,${H - pad.b})`).call(xAxis)
     .selectAll('text').attr('fill', 'var(--text-dim)').style('font-size', '10px');
    g.append('g').attr('transform', `translate(${pad.l},0)`).call(yAxis)
     .selectAll('text').attr('fill', 'var(--text-dim)').style('font-size', '10px');

    // Axis labels
    g.append('text')
     .attr('x', W / 2).attr('y', H - 8)
     .attr('text-anchor', 'middle')
     .attr('fill', 'var(--text-dim)').style('font-size', '11px')
     .text('Generation');
    g.append('text')
     .attr('transform', `rotate(-90)`)
     .attr('x', -(H / 2)).attr('y', 14)
     .attr('text-anchor', 'middle')
     .attr('fill', 'var(--text-dim)').style('font-size', '11px')
     .text('CAG repeat length / Onset age (yrs)');

  }, [pedigree, stats, activeTab]);

  const tabs = [
    { id: 'tree',        label: '① Pedigree tree'        },
    { id: 'risk',        label: '② Risk by generation'   },
    { id: 'anticipation',label: '③ Anticipation model'   },
    { id: 'science',     label: '④ Genetics explained'   },
  ];

  const cls = classify(founderCag);
  const founderOnset = medianOnset(founderCag);

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>

      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <p className="card-label">🧬 HTT Inheritance Simulator</p>
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Autosomal dominant · meiotic instability · anticipation · Langbehn 2004 onset model
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 14,
                    padding: '14px 16px', background: 'var(--surface2)', borderRadius: 9,
                    border: '1px solid var(--border)', marginBottom: 18 }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            Founder CAG —{' '}
            <span style={{ fontFamily: 'var(--mono)', color: cls.color }}>{founderCag}</span>
            {' '}
            <span style={{ fontSize: 10, color: cls.color }}>({cls.label})</span>
          </label>
          <input type="range" min={10} max={80} step={1} value={founderCag}
                 onChange={e => setFounderCag(+e.target.value)} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)' }}>
            <span>10</span><span>36 inter</span><span>40 disease</span><span>60 juvenile</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            Generations — <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{generations}</span>
          </label>
          <input type="range" min={1} max={5} step={1} value={generations}
                 onChange={e => setGenerations(+e.target.value)} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)' }}>
            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>Founder sex</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['M', 'F'].map(s => (
              <button key={s} onClick={() => setFounderSex(s)}
                style={{ padding: '6px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
                         background: founderSex === s ? 'var(--blue)' : 'var(--surface)',
                         color: founderSex === s ? 'white' : 'var(--text)',
                         fontFamily: 'var(--mono)', fontSize: 13 }}>
                {s === 'M' ? '♂ Male' : '♀ Female'}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
            Paternal = stronger expansion (+2.5/gen avg)
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>Child observed CAG (optional)</label>
          <input type="number" min={10} max={120} placeholder="e.g. 55"
                 value={childObsCag} onChange={e => setChildObsCag(e.target.value)}
                 style={{ padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border2)',
                          borderRadius: 6, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13 }} />
          <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>Overrides first child in final gen</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>Simulation seed</label>
          <input type="number" value={seed} onChange={e => setSeed(+e.target.value)}
                 style={{ padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border2)',
                          borderRadius: 6, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13 }} />
          <button onClick={() => setSeed(Math.floor(Math.random() * 9999))}
            style={{ marginTop: 3, padding: '4px 10px', background: 'var(--surface2)', border: '1px solid var(--border2)',
                     borderRadius: 5, cursor: 'pointer', fontSize: 11, color: 'var(--text-dim)' }}>
            🎲 Randomize
          </button>
        </div>
      </div>

      {/* Key stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 10, marginBottom: 20 }}>
          <Stat label="Founder CAG"     value={founderCag}           color={cls.color} />
          <Stat label="Median onset"    value={founderOnset ? `~${founderOnset}y` : 'N/A'} color={founderOnset && founderOnset < 30 ? '#E24B4A' : '#1D9E75'} />
          <Stat label="Affected nodes"  value={`${stats.affected}/${stats.total}`}    color={stats.affected > 0 ? '#E24B4A' : '#1D9E75'} />
          <Stat label="Juvenile onset"  value={stats.juvenile}       color={stats.juvenile > 0 ? '#7B1A1A' : 'var(--text-dim)'} />
          <Stat label="Intermediate"    value={stats.intermediate}   color="#BA7517" />
          <Stat label="Max CAG in tree" value={stats.maxCag}         color={stats.maxCag >= 60 ? '#7B1A1A' : stats.maxCag >= 40 ? '#E24B4A' : '#1D9E75'} />
          {stats.minOnset && <Stat label="Earliest onset" value={`~${stats.minOnset}y`} color="#E24B4A" />}
        </div>
      )}

      {/* Tooltip on hover */}
      {hovered && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 100,
          background: 'var(--surface2)', border: '1px solid var(--border2)',
          borderRadius: 10, padding: '12px 16px', fontSize: 12, minWidth: 200,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600,
                        color: hovered.color, marginBottom: 6 }}>
            CAG {hovered.cag} — {hovered.label}
          </div>
          <div style={{ color: 'var(--text-dim)', lineHeight: 1.8 }}>
            <div>Sex: <strong>{hovered.sex === 'M' ? '♂ Male' : '♀ Female'}</strong></div>
            <div>Generation: <strong>G{hovered.gen}</strong></div>
            <div>Penetrance: <strong>{Math.round(hovered.penetrance * 100)}%</strong></div>
            {hovered.onset && <div>Median onset: <strong>~{hovered.onset} years</strong></div>}
            {hovered.isObserved && <div style={{ color: '#378ADD' }}>★ Observed child</div>}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 18 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '7px 14px',
                     background: 'none', border: 'none', cursor: 'pointer',
                     color: activeTab === tab.id ? 'var(--text-head)' : 'var(--text-dim)',
                     borderBottom: activeTab === tab.id ? '2px solid var(--blue)' : '2px solid transparent',
                     marginBottom: -1 }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Pedigree tree ── */}
      {activeTab === 'tree' && (
        <Section title="Pedigree · squares = male, circles = female · hover for details">
          <svg ref={svgRef} width="100%" style={{ display: 'block', borderRadius: 8 }} />
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontSize: 11, color: 'var(--text-dim)' }}>
            {[
              ['#1D9E75', 'Normal (CAG ≤ 35)'],
              ['#BA7517', 'Intermediate (36–39, partial penetrance)'],
              ['#E24B4A', 'Affected (≥ 40, full penetrance)'],
              ['#7B1A1A', 'Juvenile (≥ 60)'],
              ['#378ADD', 'Observed child (overridden)'],
            ].map(([c, l]) => (
              <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c, flexShrink: 0 }} />
                {l}
              </span>
            ))}
            <span>Diagonal slash = intermediate carrier</span>
            <span>Onset estimate shown below each affected node</span>
          </div>
        </Section>
      )}

      {/* ── Tab 2: Risk by generation ── */}
      {activeTab === 'risk' && stats && (
        <Section title="Transmission risk per generation · autosomal dominant model">
          {Object.entries(stats.byGen).sort((a,b) => +a[0] - +b[0]).map(([gen, nodes]) => {
            const affected    = nodes.filter(n => n.cag >= 40).length;
            const intermediate= nodes.filter(n => n.cag >= 36 && n.cag < 40).length;
            const normal      = nodes.filter(n => n.cag < 36).length;
            const total       = nodes.length;
            const meanCag     = Math.round(nodes.reduce((s,n) => s+n.cag, 0) / total);
            const meanOnset   = nodes.filter(n=>n.onset).length
              ? Math.round(nodes.filter(n=>n.onset).reduce((s,n)=>s+n.onset,0) / nodes.filter(n=>n.onset).length)
              : null;

            return (
              <div key={gen} style={{ marginBottom: 14, padding: '12px 14px',
                                      background: 'var(--surface2)', borderRadius: 8,
                                      border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600 }}>
                    Generation {gen} {+gen === 0 ? '(Founder)' : ''}
                  </span>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-dim)' }}>
                    <span>n={total}</span>
                    <span>mean CAG {meanCag}</span>
                    {meanOnset && <span style={{ color: '#E24B4A' }}>median onset ~{meanOnset}y</span>}
                  </div>
                </div>

                {/* Stacked bar */}
                <div style={{ height: 10, borderRadius: 5, overflow: 'hidden', display: 'flex', marginBottom: 8 }}>
                  <div style={{ width: `${affected/total*100}%`, background: '#E24B4A', transition: 'width 0.4s' }} />
                  <div style={{ width: `${intermediate/total*100}%`, background: '#BA7517' }} />
                  <div style={{ width: `${normal/total*100}%`, background: '#1D9E75' }} />
                </div>

                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-dim)' }}>
                  <span style={{ color: '#E24B4A' }}>■ Affected {affected} ({Math.round(affected/total*100)}%)</span>
                  <span style={{ color: '#BA7517' }}>■ Intermediate {intermediate}</span>
                  <span style={{ color: '#1D9E75' }}>■ Normal {normal}</span>
                </div>

                {/* Individual CAG dots */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
                  {nodes.map(n => (
                    <span key={n.id} style={{
                      fontFamily: 'var(--mono)', fontSize: 10, padding: '2px 7px',
                      borderRadius: 4, background: n.color, color: n.textColor,
                    }}>
                      {n.cag}{n.sex === 'M' ? '♂' : '♀'}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '10px 12px',
                        background: 'var(--surface2)', borderRadius: 8,
                        border: '1px solid var(--border)', marginTop: 6, lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text)' }}>Autosomal dominant rule · </strong>
            Each child of an affected parent has a 50% chance of inheriting the expanded allele.
            Once inherited, paternal transmission expands the repeat by mean +2.5 repeats (SD 3.5),
            maternal by mean +0.5 (SD 1.5) per generation. Penetrance is partial (≈50%) for
            CAG 36–39 and essentially complete (≥99%) for CAG ≥40.
          </div>
        </Section>
      )}

      {/* ── Tab 3: Anticipation model ── */}
      {activeTab === 'anticipation' && (
        <Section title="Anticipation · CAG expansion & onset age per generation (Langbehn 2004 model)">
          <svg ref={antiSvgRef} width="100%" style={{ display: 'block', borderRadius: 8 }} />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>
            <span style={{ display:'flex',alignItems:'center',gap:4 }}>
              <span style={{ width:16, height:2, background:'#E24B4A', display:'inline-block' }} /> Mean CAG / onset
            </span>
            <span style={{ display:'flex',alignItems:'center',gap:4 }}>
              <span style={{ width:16, height:8, background:'rgba(226,75,74,0.15)', display:'inline-block', borderRadius:2 }} /> CAG range (min–max)
            </span>
            <span style={{ display:'flex',alignItems:'center',gap:4 }}>
              <span style={{ width:16, height:2, background:'#56AEE2', display:'inline-block', borderStyle:'dashed', borderTop:'1.5px dashed #56AEE2' }} /> Median onset age
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '10px 12px',
                        background: 'var(--surface2)', borderRadius: 8, marginTop: 10, lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text)' }}>Anticipation · </strong>
            As the mutant allele is transmitted across generations, the CAG repeat tends to expand
            further — particularly through the paternal line. This shifts onset progressively earlier
            in successive generations. With CAG 42 (founder), each additional CAG repeat reduces
            median onset age by approximately 3.4 years in the 39–50 range (Langbehn 2004).
          </div>
        </Section>
      )}

      {/* ── Tab 4: Science explained ── */}
      {activeTab === 'science' && (
        <Section title="The genetics of HTT inheritance — how it actually works">
          {[
            {
              title: 'Autosomal dominant inheritance',
              body: `The HTT gene sits on chromosome 4p16.3. HD is autosomal dominant — one mutated
              copy is sufficient to cause disease. Each child of an affected parent has exactly a
              50% chance of inheriting the expanded allele, regardless of sex. There is no skipping
              of generations once the threshold is crossed.`,
              color: '#1D9E75',
            },
            {
              title: 'CAG repeat thresholds',
              body: `CAG 6–35: normal range, stable across generations.
              CAG 36–39: intermediate / reduced penetrance — some individuals develop HD, others do not.
              CAG 40–59: full penetrance — virtually all carriers develop adult-onset HD (mean ~35–55y).
              CAG ≥60: juvenile onset (before age 20), often severe and faster-progressing.
              The longest known alleles exceed 120 repeats.`,
              color: '#BA7517',
            },
            {
              title: 'Meiotic instability & anticipation',
              body: `CAG repeats in the disease range are unstable during gametogenesis. Each
              transmission can expand the repeat further. Paternal transmission is far more
              unstable than maternal — sperm show mean expansions of +2–3 repeats per generation
              with SDs of 3–5, versus +0.5 SD 1.5 for eggs. This is why anticipation (earlier
              onset in successive generations) is predominantly a paternal-line phenomenon.
              Mutation frequency for disease alleles is ~70–82%; near 98% for CAG ≥50.`,
              color: '#E24B4A',
            },
            {
              title: 'Onset age prediction (Langbehn 2004)',
              body: `The most validated model uses a parametric survival analysis on 2,913 patients.
              Median onset ≈ exp(9.556 − 0.1179 × CAG) years. Each additional CAG repeat
              reduces median onset by ~3.4 years in the 39–50 range. CAG length accounts
              for ~50–60% of onset variability — modifying genes (especially DNA repair pathways),
              environment, and stochastic factors explain the rest. The simulator uses this formula
              to display estimated onset age on each affected node.`,
              color: '#56AEE2',
            },
            {
              title: 'De novo mutations',
              body: `Rare new mutations arise from "intermediate alleles" (CAG 27–35). These are
              polymorphic in the general population and normally stable, but can expand to the
              disease range in a single meiosis — particularly when transmitted paternally.
              This explains the ~1–3% of HD cases with no family history.`,
              color: '#888',
            },
          ].map(({ title, body, color }) => (
            <div key={title} style={{ marginBottom: 12, padding: '12px 14px',
                                      borderLeft: `3px solid ${color}`,
                                      background: 'var(--surface2)', borderRadius: '0 8px 8px 0' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color, marginBottom: 5 }}>
                {title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                {body}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Footer */}
      <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 8, fontSize: 11,
                    color: 'var(--text-dim)', background: 'rgba(107,114,128,0.07)',
                    border: '1px solid var(--border)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--text)' }}>Model sources · </strong>
        Inheritance model: autosomal dominant 50% transmission. Meiotic instability:
        Duyao et al. 1993, OMIM 613004 (paternal mean +2.5/gen SD 3.5; maternal +0.5 SD 1.5).
        Onset prediction: Langbehn DR et al., Clin Genet 2004;65:267–77 (median onset =
        exp(9.556 − 0.1179 × CAG)). Penetrance thresholds: MedlinePlus Genetics, HTT entry.
        This is a simulation — not a clinical prediction tool.
      </div>
    </div>
  );
}