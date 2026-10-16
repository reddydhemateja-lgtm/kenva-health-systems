import React, { useState } from 'react';
import { LogIn, UserCheck, Building2, ShieldCheck, Lock, Mail, AlertCircle, Sparkles, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import OtpVerificationModal from '../components/OtpVerificationModal';

export default function LoginPage({ setActiveTab, onOpenDemoModal }) {
  const { login } = useAuth();
  
  const [activeRoleTab, setActiveRoleTab] = useState('PATIENT');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Step state
  const [otpState, setOtpState] = useState(null); // { userId, maskedEmail, message, demoOtp }

  // Forgot Password modal state
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState('REQUEST'); // 'REQUEST' | 'RESET' | 'DONE'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotUserId, setForgotUserId] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotDemoOtp, setForgotDemoOtp] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier || !password) {
      setError('Please fill in all credentials.');
      return;
    }

    setLoading(true);
    try {
      const data = await login(identifier, password, activeRoleTab);

      if (!data.otpSent && data.user) {
        // ADMIN / HOSPITAL — direct login, token already stored in AuthContext
        const { role } = data.user;
        if (role === 'ADMIN') setActiveTab('admin-dashboard');
        else if (role === 'HOSPITAL') setActiveTab('hospital-dashboard');
      } else if (data.otpSent) {
        // PATIENT — move to OTP verification screen
        setOtpState({ 
          userId: data.userId, 
          maskedEmail: data.maskedEmail, 
          message: data.message,
          demoOtp: data.demoOtp
        });
      }
    } catch (err) {
      setError(err.message || 'Invalid login credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabSwitch = (role) => {
    setActiveRoleTab(role);
    setError('');
    setIdentifier('');
    setPassword('');
    setOtpState(null);
  };

  // Forgot Password Request
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request password reset.');
      
      setForgotUserId(data.userId || '');
      if (data.demoOtp) {
        setForgotDemoOtp(data.demoOtp);
      }
      setForgotStep('RESET');
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  // Reset Password Submit
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setForgotError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: forgotUserId,
          otp: forgotOtp.trim(),
          newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password.');

      setForgotSuccess('Password updated successfully. You can now log in.');
      setForgotStep('DONE');
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  // If OTP step active, render OTP screen
  if (otpState) {
    return (
      <OtpVerificationModal
        otpState={otpState}
        setActiveTab={setActiveTab}
        onBack={() => setOtpState(null)}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4 animate-fadeIn">
      <div className="glass-panel p-8 rounded-2xl border border-teal-500/30 shadow-2xl relative overflow-hidden">
        
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="font-heading font-extrabold text-2xl text-white">
            Kenva Portal Login
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Select your portal type below to log in.
          </p>
        </div>

        {/* Portal Role Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleTabSwitch('PATIENT')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
              activeRoleTab === 'PATIENT' ? 'bg-teal-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Patient
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('HOSPITAL')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
              activeRoleTab === 'HOSPITAL' ? 'bg-cyan-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Hospital
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('ADMIN')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
              activeRoleTab === 'ADMIN' ? 'bg-teal-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Admin
          </button>
        </div>

        {/* Quick Demo Credentials Banner */}
        <div className="mb-6 p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-300">Need test credentials?</span>
          <button
            type="button"
            onClick={onOpenDemoModal}
            className="text-cyan-400 font-semibold hover:underline flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" /> 1-Click Demo
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              {activeRoleTab === 'PATIENT' ? 'Email Address or Patient ID (KEN-P-1001)' : 'Email Address'}
            </label>
            <div className="flex items-center rounded-xl bg-slate-950/80 border border-slate-700/80 focus-within:border-teal-400 transition-colors overflow-hidden">
              <div className="px-3.5 py-2.5 text-slate-400 border-r border-slate-800 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={
                  activeRoleTab === 'PATIENT' 
                    ? 'patient@kenva.local or KEN-P-1001' 
                    : activeRoleTab === 'HOSPITAL' 
                      ? 'hospital@kenva.local' 
                      : 'admin@kenva.local'
                }
                className="w-full bg-transparent px-3 py-2.5 text-xs text-white focus:outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsForgotOpen(true);
                  setForgotStep('REQUEST');
                  setForgotError('');
                }}
                className="text-[11px] text-teal-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="flex items-center rounded-xl bg-slate-950/80 border border-slate-700/80 focus-within:border-teal-400 transition-colors overflow-hidden">
              <div className="px-3.5 py-2.5 text-slate-400 border-r border-slate-800 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent px-3 py-2.5 text-xs text-white focus:outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* OTP notice - patients only */}
          {activeRoleTab === 'PATIENT' && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-teal-400" />
              A 6-digit verification code will be sent to your registered email after password check.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`text-xs w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg transition-all ${
              activeRoleTab === 'PATIENT'
                ? 'btn-teal'
                : activeRoleTab === 'HOSPITAL'
                  ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                  : 'bg-teal-600 text-white hover:bg-teal-500'
            }`}
          >
            {loading ? 'Signing in...' : activeRoleTab === 'PATIENT' ? 'Continue to Email Verification' : 'Sign In'}
          </button>

        </form>

        {activeRoleTab === 'PATIENT' && (
          <p className="text-[11px] text-center text-slate-400 mt-6 pt-4 border-t border-slate-800">
            Don't have a patient account yet?{' '}
            <button
              onClick={() => setActiveTab('register')}
              className="text-teal-400 font-semibold hover:underline"
            >
              Register New Account
            </button>
          </p>
        )}

      </div>

      {/* Forgot Password Modal */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-teal-500/30 shadow-2xl relative">
            <h3 className="font-heading font-bold text-lg text-white mb-2">Reset Password</h3>

            {forgotError && (
              <div className="p-3 mb-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotStep === 'REQUEST' && (
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Enter your registered email address and we'll send a 6-digit verification code to reset your password.
                </p>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="patient@example.com"
                    className="glass-input text-xs"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(false)}
                    className="btn-secondary text-xs w-1/2 py-2.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-teal text-xs w-1/2 py-2.5"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Code'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'RESET' && (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                {forgotDemoOtp && (
                  <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between">
                    <span>Demo Reset Code: <strong className="font-mono text-sm">{forgotDemoOtp}</strong></span>
                    <button
                      type="button"
                      onClick={() => setForgotOtp(forgotDemoOtp)}
                      className="px-2 py-0.5 text-[10px] bg-cyan-500/20 rounded border border-cyan-500/40"
                    >
                      Use Code
                    </button>
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">6-Digit OTP Code</label>
                  <input
                    type="text"
                    required
                    maxLength="6"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="glass-input text-xs font-mono tracking-widest text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="glass-input text-xs"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('REQUEST')}
                    className="btn-secondary text-xs w-1/2 py-2.5"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-teal text-xs w-1/2 py-2.5"
                  >
                    {forgotLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'DONE' && (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-xs text-emerald-300 font-semibold">{forgotSuccess}</p>
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(false)}
                  className="btn-teal text-xs py-2 px-5 mt-2"
                >
                  Return to Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
