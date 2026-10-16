import React, { useState } from 'react';
import { X, Sparkles, UserCheck, Clock, Building2, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DemoCredentialsModal({ isOpen, onClose, setActiveTab }) {
  const { login, verifyOtp } = useAuth();
  const [loadingRole, setLoadingRole] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  /**
   * Full two-step quick login:
   *  1. POST /api/auth/login  → gets OTP (or demoOtp when SMTP not configured)
   *  2. POST /api/auth/verify-otp → receives JWT and navigates to dashboard
   */
  const handleQuickLogin = async (identifier, password, expectedRole, targetDashboard) => {
    setLoadingRole(identifier);
    setErrorMsg('');
    try {
      // Step 1 — credentials check + OTP generation
      const step1 = await login(identifier, password, expectedRole);

      if (step1.otpSent) {
        if (step1.demoOtp) {
          // SMTP not configured → use the demo OTP returned by the server
          await verifyOtp(step1.userId, step1.demoOtp);
          onClose();
          setActiveTab(targetDashboard);
        } else {
          // SMTP IS configured — close modal and redirect to login so user can enter OTP from email
          onClose();
          setActiveTab('login');
          alert(`OTP sent to ${step1.maskedEmail}. Please check your email and log in via the login page.`);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Quick login failed. Please try manually.');
    } finally {
      setLoadingRole(null);
    }
  };

  const accounts = [
    {
      label: 'Approved Patient',
      badgeClass: 'badge badge-approved',
      cardClass: 'hover:border-teal-400/60 hover:bg-teal-500/10',
      arrowClass: 'text-teal-400',
      icon: <UserCheck className="w-3 h-3" />,
      name: 'Kalyan Varma',
      sub: 'Patient ID: KEN-P-1001 (Tirupati)',
      subClass: 'text-teal-400',
      bullets: ['Booking Permission Unlocked', 'View Sample Journey (10 Stages)', 'View & Download Diagnostic Reports'],
      identifier: 'patient@kenva.local',
      password: 'Password123!',
      role: 'PATIENT',
      dashboard: 'patient-dashboard',
    },
    {
      label: 'Pending Patient',
      badgeClass: 'badge badge-pending',
      cardClass: 'hover:border-amber-400/60 hover:bg-amber-500/10',
      arrowClass: 'text-amber-400',
      icon: <Clock className="w-3 h-3" />,
      name: 'Ananya Rao',
      sub: 'Patient ID: KEN-P-1002 (Tirupati)',
      subClass: 'text-amber-400',
      bullets: ['Awaiting Admin Approval banner', 'Test code generation in Admin portal', 'Test unlocking appointment booking'],
      identifier: 'pending.patient@kenva.local',
      password: 'Password123!',
      role: 'PATIENT',
      dashboard: 'patient-dashboard',
    },
    {
      label: 'Hospital Staff',
      badgeClass: 'badge badge-info',
      cardClass: 'hover:border-cyan-400/60 hover:bg-cyan-500/10',
      arrowClass: 'text-cyan-400',
      icon: <Building2 className="w-3 h-3" />,
      name: 'Metro Care Hospital Staff',
      sub: 'Metro Care Diagnostic (Air Bypass Road)',
      subClass: 'text-cyan-300',
      bullets: ['Confirm/Reject Appointments', 'Create Orders & Register Barcodes', 'Advance 10-stage sample workflow'],
      identifier: 'hospital@kenva.local',
      password: 'Password123!',
      role: 'HOSPITAL',
      dashboard: 'hospital-dashboard',
    },
    {
      label: 'System Admin',
      badgeClass: 'badge badge-pending border-purple-500/30 bg-purple-500/10 text-purple-300',
      cardClass: 'hover:border-purple-400/60 hover:bg-purple-500/10',
      arrowClass: 'text-purple-400',
      icon: <ShieldCheck className="w-3 h-3" />,
      name: 'Kenva Health Systems Admin',
      sub: 'Master System Administrator',
      subClass: 'text-purple-300',
      bullets: ['Approve Patients, Generate Codes & Manage Passwords', 'Monitor 10 KPI Dashboard Metrics', 'Audit Logs & SMTP Email Config'],
      identifier: 'reddydhemateja@gmail.com',
      password: 'nanireddykenva',
      role: 'ADMIN',
      dashboard: 'admin-dashboard',
    },
  ];

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
            <p className="text-xs text-slate-400">Select any role below to instantly log in and explore system workflows.</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            ⚠ {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {accounts.map((acc) => {
            const isThisLoading = loadingRole === acc.identifier;
            const busy = loadingRole !== null;
            return (
              <div
                key={acc.identifier}
                onClick={() => !busy && handleQuickLogin(acc.identifier, acc.password, acc.role, acc.dashboard)}
                className={`glass-card p-4 cursor-pointer transition-all group relative ${acc.cardClass} ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={acc.badgeClass}>
                    {acc.icon} {acc.label}
                  </span>
                  {isThisLoading ? (
                    <Loader2 className={`w-4 h-4 ${acc.arrowClass} animate-spin`} />
                  ) : (
                    <ArrowRight className={`w-4 h-4 ${acc.arrowClass} group-hover:translate-x-1 transition-transform`} />
                  )}
                </div>
                <h4 className="font-bold text-white text-sm">{acc.name}</h4>
                <p className={`text-xs font-mono mt-0.5 ${acc.subClass}`}>{acc.sub}</p>
                <p className="text-xs text-slate-300 mt-2">
                  {acc.bullets.map((b, i) => (
                    <span key={i}>• {b}{i < acc.bullets.length - 1 ? <br /> : null}</span>
                  ))}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          Tip: You can also log in directly using the Login page with your credentials.
        </div>
      </div>
    </div>
  );
}
