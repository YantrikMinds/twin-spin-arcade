import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Billing from './pages/Billing';
import Queue from './pages/Queue';
import TicketsHistory from './pages/TicketsHistory';
import AdminDashboard from './pages/AdminDashboard';
import AdminGames from './pages/AdminGames';
import AdminDiscounts from './pages/AdminDiscounts';
import AdminSettings from './pages/AdminSettings';

export default function App() {
  const { user, isAdmin } = useAuth();

  // Active tab: default to 'dashboard' for Admin, 'billing' for Billing staff
  const [activeTab, setActiveTab] = useState(() => {
    return isAdmin ? 'dashboard' : 'billing';
  });

  // If user is not logged in, show Login page
  if (!user) {
    return <Login />;
  }

  // Ensure non-admin users cannot access admin tabs
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return isAdmin ? <AdminDashboard onNavigateTab={setActiveTab} /> : <Billing />;
      case 'billing':
        return <Billing />;
      case 'queue':
        return <Queue />;
      case 'tickets':
        return <TicketsHistory />;
      case 'games':
        return isAdmin ? <AdminGames /> : <Billing />;
      case 'discounts':
        return isAdmin ? <AdminDiscounts /> : <Billing />;
      case 'settings':
        return isAdmin ? <AdminSettings /> : <Billing />;
      default:
        return isAdmin ? <AdminDashboard onNavigateTab={setActiveTab} /> : <Billing />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-white pb-24 md:pb-8 safe-bottom">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1">
        {renderContent()}
      </main>
    </div>
  );
}
