import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

function parseTreeToHierarchy(node) {
  if (!node) return null;
  return {
    name: node.symbol || node.name,
    start: node.start,
    end: node.end,
    children: node.children ? node.children.map(parseTreeToHierarchy) : [],
  };
}

export default function ParseTreeCard({ parseTree }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!parseTree) return;
    const root = parseTreeToHierarchy(parseTree);
    if (!root) return;

    const width  = 580;
    const height = 280;
    const margin = { top: 16, right: 16, bottom: 16, left: 48 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', [0, 0, width, height]);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const hierarchy  = d3.hierarchy(root);
    const treeLayout = d3.tree().size([
      height - margin.top - margin.bottom,
      width  - margin.left - margin.right,
    ]);
    treeLayout(hierarchy);

    // Links
    g.append('g')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.08)')
      .attr('stroke-width', 1.5)
      .selectAll('path')
      .data(hierarchy.links())
      .join('path')
      .attr('d', d3.linkHorizontal().x(d => d.y).y(d => d.x));

    // Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(hierarchy.descendants())
      .join('g')
      .attr('transform', d => `translate(${d.y},${d.x})`);

    node.append('circle')
      .attr('r', 4.5)
      .attr('fill', d => d.children ? '#185FA5' : '#1D9E75')
      .attr('stroke', 'var(--surface)')
      .attr('stroke-width', 1.5);

    node.append('text')
      .attr('dy', '0.32em')
      .attr('x', d => d.children ? -9 : 9)
      .attr('text-anchor', d => d.children ? 'end' : 'start')
      .attr('fill', '#9ca3af')
      .style('font-size', '10px')
      .style('font-family', 'var(--mono)')
      .text(d => d.data.name);
  }, [parseTree]);

  return (
    <div className="card">
      <p className="card-label">CFG parse tree</p>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>Grammar structure of HTT exon 1</p>
      {parseTree ? (
        <svg
          ref={svgRef}
          style={{ width: '100%', height: 240, background: 'var(--surface2)', borderRadius: 8, display: 'block' }}
        />
      ) : (
        <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)' }}>
          No parse tree — run analysis first
        </div>
      )}
      <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
        {[['#185FA5','Non-terminal'],['#1D9E75','Terminal']].map(([c,l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-dim)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}