import React from 'react';
import { X, Sparkles, UserCheck, Clock, Building2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DemoCredentialsModal({ isOpen, onClose, setActiveTab }) {
  const { login } = useAuth();

  if (!isOpen) return null;

  const handleQuickLogin = async (identifier, password, expectedRole, targetDashboard) => {
    try {
      await login(identifier, password, expectedRole);
      onClose();
      setActiveTab(targetDashboard);
    } catch (err) {
      alert(`Login error: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-2xl p-6 sm:p-8 rounded-2xl border border-teal-500/30 shadow-2xl relative bg-[#0b132b]">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-xl text-white">Kenva Quick Access Portals</h3>
            <p className="text-xs text-slate-400">Select any role below to log in and access system workflows.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          
          {/* Approved Patient */}
          <div 
            onClick={() => handleQuickLogin('patient@kenva.local', 'Password123!', 'PATIENT', 'patient-dashboard')}
            className="glass-card p-4 cursor-pointer hover:border-teal-400/60 hover:bg-teal-500/10 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="badge badge-approved">
                <UserCheck className="w-3 h-3" /> Approved Patient
              </span>
              <ArrowRight className="w-4 h-4 text-teal-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="font-bold text-white text-sm">Kalyan Varma</h4>
            <p className="text-xs text-teal-400 font-mono mt-0.5">Patient ID: KEN-P-1001 (Tirupati)</p>
            <p className="text-xs text-slate-300 mt-2">
              • Booking Permission Unlocked<br/>
              • View Sample Journey (10 Stages)<br/>
              • View & Download Diagnostic Reports
            </p>
          </div>

          {/* Pending Approval Patient */}
          <div 
            onClick={() => handleQuickLogin('pending.patient@kenva.local', 'Password123!', 'PATIENT', 'patient-dashboard')}
            className="glass-card p-4 cursor-pointer hover:border-amber-400/60 hover:bg-amber-500/10 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="badge badge-pending">
                <Clock className="w-3 h-3" /> Pending Patient
              </span>
              <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="font-bold text-white text-sm">Ananya Rao</h4>
            <p className="text-xs text-amber-400 font-mono mt-0.5">Patient ID: KEN-P-1002 (Tirupati)</p>
            <p className="text-xs text-slate-300 mt-2">
              • Awaiting Admin Approval banner<br/>
              • Test code generation in Admin portal<br/>
              • Test unlocking appointment booking
            </p>
          </div>

          {/* Hospital Staff */}
          <div 
            onClick={() => handleQuickLogin('hospital@kenva.local', 'Password123!', 'HOSPITAL', 'hospital-dashboard')}
            className="glass-card p-4 cursor-pointer hover:border-cyan-400/60 hover:bg-cyan-500/10 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="badge badge-info">
                <Building2 className="w-3 h-3" /> Hospital Staff
              </span>
              <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="font-bold text-white text-sm">Metro Care Hospital Staff</h4>
            <p className="text-xs text-cyan-300 mt-0.5">Metro Care Diagnostic (Air Bypass Road)</p>
            <p className="text-xs text-slate-300 mt-2">
              • Confirm/Reject Appointments<br/>
              • Create Orders & Register Barcodes<br/>
              • Advance 10-stage sample workflow
            </p>
          </div>

          {/* System Administrator */}
          <div 
            onClick={() => handleQuickLogin('admin@kenva.local', 'AdminPassword123!', 'ADMIN', 'admin-dashboard')}
            className="glass-card p-4 cursor-pointer hover:border-purple-400/60 hover:bg-purple-500/10 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="badge badge-pending border-purple-500/30 bg-purple-500/10 text-purple-300">
                <ShieldCheck className="w-3 h-3" /> System Admin
              </span>
              <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="font-bold text-white text-sm">Kenva Health Systems Admin</h4>
            <p className="text-xs text-purple-300 mt-0.5">Master System Administrator</p>
            <p className="text-xs text-slate-300 mt-2">
              • Approve Patients, Generate Codes & Manage Passwords<br/>
              • Monitor 10 KPI Dashboard Metrics<br/>
              • Audit Logs & SMTP Email Config
            </p>
          </div>

        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          Tip: You can also log in directly using standard login credentials.
        </div>
      </div>
    </div>
  );
}
