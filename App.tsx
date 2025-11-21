
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CreateRafflePage from './pages/CreateRafflePage';
import RaffleDetailPage from './pages/RaffleDetailPage';
import RaffleAdminPage from './pages/RaffleAdminPage';
import PaymentPage from './pages/PaymentPage';
import SiteAdminLoginPage from './pages/SiteAdminLoginPage';
import SiteAdminPage from './pages/SiteAdminPage';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/criar-rifa" element={<CreateRafflePage />} />
        <Route path="/rifa/:id" element={<RaffleDetailPage />} />
        <Route path="/rifa/:id/admin" element={<RaffleAdminPage />} />
        <Route path="/rifa/:id/pagamento" element={<PaymentPage />} />
        
        {/* Site Owner Admin Routes */}
        <Route path="/admin/login" element={<SiteAdminLoginPage />} />
        <Route path="/admin/dashboard" element={<SiteAdminPage />} />
      </Routes>
    </HashRouter>
  );
};

export default App;