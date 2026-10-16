import React, { useState } from 'react';
import { Activity, ShieldCheck, User, Building2, LogOut, Menu, X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab, onOpenDemoModal }) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="badge badge-pending"><ShieldCheck className="w-3 h-3" /> System Admin</span>;
      case 'HOSPITAL':
        return <span className="badge badge-info"><Building2 className="w-3 h-3" /> Hospital Staff</span>;
      case 'PATIENT':
        return <span className="badge badge-approved"><User className="w-3 h-3" /> Patient Portal</span>;
      default:
        return null;
    }
  };

  const handleNavClick = (tabId, elementId = null) => {
    setActiveTab(tabId);
    if (elementId) {
      setTimeout(() => {
        const el = document.getElementById(elementId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDashboardClick = () => {
    if (!user) {
      setActiveTab('login');
      return;
    }
    const userRole = user.role || user.user?.role;
    if (userRole === 'PATIENT') setActiveTab('patient-dashboard');
    else if (userRole === 'HOSPITAL') setActiveTab('hospital-dashboard');
    else if (userRole === 'ADMIN') setActiveTab('admin-dashboard');
    else setActiveTab('login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-white/10 bg-[#0b132b]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Tagline */}
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => handleNavClick('landing')}
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-600 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0b132b] rounded-[10px] flex items-center justify-center">
                <Activity className="w-6 h-6 text-teal-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-xl tracking-tight text-white group-hover:text-teal-400 transition-colors">
                  KENVA
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  HEALTH
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Clinical Diagnostic & Specimen Logistics Network
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => handleNavClick('landing')}
              className={`text-sm font-medium transition-colors ${activeTab === 'landing' ? 'text-teal-400 font-semibold' : 'text-slate-300 hover:text-white'}`}
            >
              Home
            </button>
            <button
              onClick={() => handleNavClick('about', 'about')}
              className={`text-sm font-medium transition-colors ${activeTab === 'about' ? 'text-teal-400 font-semibold' : 'text-slate-300 hover:text-white'}`}
            >
              About
            </button>
            <button
              onClick={() => handleNavClick('workflow', 'workflow')}
              className={`text-sm font-medium transition-colors ${activeTab === 'workflow' ? 'text-teal-400 font-semibold' : 'text-slate-300 hover:text-white'}`}
            >
              Workflow
            </button>
            <button
              onClick={() => handleNavClick('hospitals', 'hospitals')}
              className={`text-sm font-medium transition-colors ${activeTab === 'hospitals' ? 'text-teal-400 font-semibold' : 'text-slate-300 hover:text-white'}`}
            >
              Partner Facilities
            </button>
          </div>

          {/* User Auth Action & Quick Access Button */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onOpenDemoModal}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Quick Portals Access"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Quick Portals
            </button>

            {user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-700">
                <div className="text-right">
                  <div className="text-sm font-semibold text-white flex items-center justify-end gap-2">
                    {user.name}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    {getRoleBadge(user.role || user.user?.role)}
                  </div>
                </div>

                <button
                  onClick={handleDashboardClick}
                  className="btn-teal text-xs py-1.5 px-4 cursor-pointer font-bold shadow-lg"
                >
                  Dashboard
                </button>

                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavClick('login')}
                  className="btn-secondary text-xs py-2 px-4 cursor-pointer"
                >
                  Log In
                </button>
                <button
                  onClick={() => handleNavClick('register')}
                  className="btn-teal text-xs py-2 px-4 cursor-pointer"
                >
                  Register Patient
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={onOpenDemoModal}
              className="p-2 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" /> Portals
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-t border-white/10 p-4 space-y-3 bg-[#0b132b]/95">
          <button
            onClick={() => { handleNavClick('landing'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-sm font-medium text-slate-200"
          >
            Home
          </button>
          <button
            onClick={() => { handleNavClick('about', 'about'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-sm font-medium text-slate-200"
          >
            About Kenva
          </button>
          <button
            onClick={() => { handleNavClick('workflow', 'workflow'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-sm font-medium text-slate-200"
          >
            Sample Workflow
          </button>
          <button
            onClick={() => { handleNavClick('hospitals', 'hospitals'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-sm font-medium text-slate-200"
          >
            Partner Facilities
          </button>

          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            {user ? (
              <>
                <div className="text-sm font-semibold text-teal-400">{user.name} ({user.role || user.user?.role})</div>
                <button
                  onClick={() => {
                    handleDashboardClick();
                    setMobileMenuOpen(false);
                  }}
                  className="btn-teal text-xs w-full py-2"
                >
                  Go to Portal Dashboard
                </button>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="btn-secondary text-xs w-full py-2 text-rose-400"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { handleNavClick('login'); setMobileMenuOpen(false); }}
                  className="btn-secondary text-xs w-full py-2"
                >
                  Portal Login
                </button>
                <button
                  onClick={() => { handleNavClick('register'); setMobileMenuOpen(false); }}
                  className="btn-teal text-xs w-full py-2"
                >
                  Register New Patient
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
