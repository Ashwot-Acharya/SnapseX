import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './Navbar';
import DetectorPage from './DetectorPage';
import InteractionsPage from './InteractionsPage';
import HeredityPage from './HeredityPage';
import ProteinPage from './ProteinPage';
import ComparePage from './ComparePage';
import MutatedProteinAnalyzer from './MutatedProteinAnalyzer';
import DrugInteractionPage from './DrugInteractionPage';

function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        <Navbar />
        <main style={{ flex: 1, maxWidth: 1160, margin: '0 auto', padding: '28px 20px 48px', width: '100%' }}>
          <Routes>
            {/* Original / existing pages */}
            <Route path="/" element={<DetectorPage />} />
            <Route path="/interactions" element={<InteractionsPage />} />
            <Route path="/heredity" element={<HeredityPage />} />
            <Route path="/protein" element={<ProteinPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/proteinanalyzer" element={<MutatedProteinAnalyzer />} />
            <Route path="/drug" element={<DrugInteractionPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;