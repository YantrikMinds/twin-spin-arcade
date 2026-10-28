import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import {
  Gamepad2,
  Receipt,
  Users,
  LayoutDashboard,
  Settings,
  Tag,
  LogOut,
  Clock,
  Menu,
  X,
  CreditCard,
  Maximize2,
  Minimize2
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, isAdmin } = useAuth();
  const { settings } = useSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const billingNavItems = [
    { id: 'billing', label: 'Billing POS', icon: CreditCard },
    { id: 'queue', label: 'Live Queue', icon: Clock },
    { id: 'tickets', label: 'Past Tickets', icon: Receipt },
  ];

  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'billing', label: 'Counter POS', icon: CreditCard },
    { id: 'queue', label: 'Station Queue', icon: Clock },
    { id: 'tickets', label: 'Tickets History', icon: Receipt },
    { id: 'games', label: 'Games & Pricing', icon: Gamepad2 },
    { id: 'discounts', label: 'Discounts', icon: Tag },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navItems = isAdmin ? adminNavItems : billingNavItems;

  const handleNavClick = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo & Name */}
            <div
              className="flex items-center space-x-3 cursor-pointer select-none"
              onClick={() => handleNavClick(isAdmin ? 'dashboard' : 'billing')}
            >
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-white tracking-tight">
                  {settings.store_name || 'Twin Spin Arcade'}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-medium text-slate-400 bg-slate-800 border border-slate-700 rounded-md">
                  POS
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* User Profile & Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              
              {/* Fullscreen Toggle (Kiosk Mode) */}
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Kiosk Fullscreen'}
                className="hidden sm:flex p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200 leading-tight">
                  {user?.name || user?.username}
                </span>
                <span className={`text-[10px] font-medium ${isAdmin ? 'text-blue-400' : 'text-emerald-400'}`}>
                  {isAdmin ? 'Admin' : 'Counter Staff'}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Log Out"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Dropdown Menu (Top Drawer) */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-2 pb-4 space-y-1">
            <div className="py-2 px-3 border-b border-slate-800 mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-200">{user?.name || user?.username}</p>
                <p className="text-[11px] text-blue-400 uppercase font-medium">{user?.role}</p>
              </div>
            </div>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar (Phone-first for on-the-go actions) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 px-2 pt-1.5 pb-3 safe-bottom flex justify-around items-center">
        {navItems.slice(0, 5).map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center py-1 px-2 rounded-lg text-xs transition-colors ${
                isActive ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] truncate max-w-[64px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
