import React, { useState } from 'react';
import { X, Sparkles, UserCheck, Building2, ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DemoCredentialsModal({ isOpen, onClose, setActiveTab }) {
  const { login, verifyOtp } = useAuth();
  const [loadingRole, setLoadingRole] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  /**
   * Quick login handler:
   *  - ADMIN / HOSPITAL: direct token issued by backend -> navigate immediately
   *  - PATIENT: OTP flow (auto-submits demoOtp if SMTP not configured)
   */
  const handleQuickLogin = async (identifier, password, expectedRole, targetDashboard) => {
    setLoadingRole(identifier);
    setErrorMsg('');
    try {
      const step1 = await login(identifier, password, expectedRole);

      if (step1.otpSent) {
        if (step1.demoOtp) {
          await verifyOtp(step1.userId, step1.demoOtp);
          onClose();
          setActiveTab(targetDashboard);
        } else {
          onClose();
          setActiveTab('login');
          alert(`OTP sent to ${step1.maskedEmail}. Please check your email and log in via the login page.`);
        }
      } else {
        onClose();
        setActiveTab(targetDashboard);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Quick login failed. Please try manually.');
    } finally {
      setLoadingRole(null);
    }
  };

  const accounts = [
    {
      label: 'Verified Patient (Device 1)',
      badgeClass: 'badge badge-approved',
      cardClass: 'hover:border-teal-400/60 hover:bg-teal-500/10',
      arrowClass: 'text-teal-400',
      icon: <UserCheck className="w-3 h-3" />,
      name: 'Kalyan Varma',
      sub: 'Patient ID: KEN-P-1001 (Tirupati)',
      subClass: 'text-teal-400',
      bullets: ['Direct Appointment Booking', 'Live 11-Stage Sample Journey', 'Assigned Collector Details & PDF Reports'],
      identifier: 'patient@kenva.local',
      password: 'Password123!',
      role: 'PATIENT',
      dashboard: 'patient-dashboard',
    },
    {
      label: 'Hospital Staff (Device 2)',
      badgeClass: 'badge badge-info',
      cardClass: 'hover:border-cyan-400/60 hover:bg-cyan-500/10',
      arrowClass: 'text-cyan-400',
      icon: <Building2 className="w-3 h-3" />,
      name: 'Metro Care Clinical Staff',
      sub: 'Facility: Metro Care Diagnostic (MCDI)',
      subClass: 'text-cyan-300',
      bullets: ['Confirm Appointments & Schedule Collection', 'Assign Collector & Register Specimen', 'Workflow Controller (Advance/Skip/Publish)'],
      identifier: 'hospital@kenva.local',
      password: 'Password123!',
      role: 'HOSPITAL',
      dashboard: 'hospital-dashboard',
    },
    {
      label: 'Patient (Secondary Session)',
      badgeClass: 'badge badge-approved',
      cardClass: 'hover:border-teal-400/60 hover:bg-teal-500/10',
      arrowClass: 'text-teal-400',
      icon: <UserCheck className="w-3 h-3" />,
      name: 'Ananya Rao',
      sub: 'Patient ID: KEN-P-1002 (Tirupati)',
      subClass: 'text-teal-300',
      bullets: ['Independent Patient Record Isolation', 'Real-time In-App Notifications', 'Direct Booking Without Admin Code'],
      identifier: 'pending.patient@kenva.local',
      password: 'Password123!',
      role: 'PATIENT',
      dashboard: 'patient-dashboard',
    },
    {
      label: 'System Admin',
      badgeClass: 'badge badge-approved border-teal-500/30 bg-teal-500/10 text-teal-300',
      cardClass: 'hover:border-teal-400/60 hover:bg-teal-500/10',
      arrowClass: 'text-teal-400',
      icon: <ShieldCheck className="w-3 h-3" />,
      name: 'Kenva Health Systems Admin',
      sub: 'Central Administration Hub',
      subClass: 'text-teal-300',
      bullets: ['Central Facility & Workflow Audit', 'Security & Access Role Monitoring', 'System Audit Trail & Server Telemetry'],
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
            <p className="text-xs text-slate-400">Select any role below to instantly log in and test the live connected workflow across devices.</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {accounts.map((acc) => {
            const isThisLoading = loadingRole === acc.identifier;
            const busy = loadingRole !== null;
            return (
              <div
                key={acc.identifier}
                className={`glass-card p-5 rounded-xl border border-slate-800 transition-all cursor-pointer relative group ${acc.cardClass} ${
                  busy && !isThisLoading ? 'opacity-50 pointer-events-none' : ''
                }`}
                onClick={() => !busy && handleQuickLogin(acc.identifier, acc.password, acc.role, acc.dashboard)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`${acc.badgeClass} flex items-center gap-1.5`}>
                    {acc.icon}
                    {acc.label}
                  </span>
                  <div className={`p-1.5 rounded-lg bg-slate-900 border border-slate-800 ${acc.arrowClass} group-hover:scale-110 transition-transform`}>
                    {isThisLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>

                <div className="font-semibold text-white text-sm">{acc.name}</div>
                <div className={`text-[11px] font-mono mt-0.5 ${acc.subClass}`}>{acc.sub}</div>

                <ul className="mt-3 space-y-1 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
                  {acc.bullets.map((b, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-teal-400 shrink-0"></span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono">{acc.identifier}</span>
                  <span className="text-teal-400 font-semibold group-hover:underline">Click to Enter &rarr;</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center text-[11px] text-slate-400 border-t border-slate-800 pt-4 flex items-center justify-between">
          <span>Tip: Open Patient Portal in one browser window and Hospital Portal in another to test real-time updates.</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
