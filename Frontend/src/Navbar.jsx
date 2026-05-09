import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const links = [
    { path: '/', label: 'Detector' },
    { path: '/interactions', label: 'Gene Interactions' },
    { path: '/heredity', label: 'Heredity' },
    { path: '/proteinanalyzer', label: 'Protein Analyzer' },
    { path: '/drug', label: 'Drug Interaction' }


  ];
  return (
    <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: 'var(--blue)', borderRadius: 6 }} />
          <span style={{ fontWeight: 500, fontSize: 14 }}>HTT Explorer</span>
        </div>
        <nav style={{ display: 'flex', gap: 16 }}>
          {links.map(link => (
            <Link
              key={link.path}
              to={link.path}
              style={{
                color: location.pathname === link.path ? 'var(--text-head)' : 'var(--text-dim)',
                textDecoration: 'none',
                fontSize: 13,
                fontFamily: 'var(--mono)',
                padding: '4px 0',
                borderBottom: location.pathname === link.path ? '2px solid var(--blue)' : 'none',
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}