import React, { useState, useEffect, useRef } from 'react';
import { Mail, ShieldCheck, RefreshCw, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * OTP Verification Step — shown after Step 1 login succeeds
 * Props:
 *   otpState: { userId, maskedEmail, message }
 *   onSuccess: (user) => void — called after OTP verified
 *   onBack: () => void — go back to login form
 *   setActiveTab: (tab) => void — navigate to dashboard
 */
export default function OtpVerificationModal({ otpState, onSuccess, onBack, setActiveTab }) {
  const { verifyOtp, resendOtp, loading } = useAuth();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const inputs = useRef([]);

  // Auto-fill if demo OTP is provided (no SMTP configured)
  useEffect(() => {
    if (otpState.demoOtp && otpState.demoOtp.length === 6) {
      setDigits(otpState.demoOtp.split(''));
    }
  }, [otpState.demoOtp]);

  // Countdown for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleDigit = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    setError('');
    if (v && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setDigits(text.split(''));
      inputs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleVerify = async () => {
    const otp = digits.join('');
    if (otp.length !== 6) {
      setError('Please enter all 6 digits of your OTP.');
      return;
    }
    setError('');
    try {
      const user = await verifyOtp(otpState.userId, otp);
      setSuccess(true);
      setTimeout(() => {
        const tab = user.role === 'ADMIN' ? 'admin-dashboard'
          : user.role === 'HOSPITAL' ? 'hospital-dashboard'
          : 'patient-dashboard';
        if (onSuccess) onSuccess(user);
        if (setActiveTab) setActiveTab(tab);
      }, 1200);
    } catch (err) {
      setError(err.message);
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      const data = await resendOtp(otpState.userId);
      setResendMsg(data.message || 'New code sent!');
      setResendCooldown(60);
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b132b]">
        <div className="glass-panel p-10 rounded-2xl text-center max-w-sm mx-auto">
          <CheckCircle2 className="w-16 h-16 text-teal-400 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-white mb-2">Verified!</h2>
          <p className="text-slate-400 text-sm">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b132b] px-4">
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl border border-teal-500/30">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/30 mb-4">
            <Mail className="w-8 h-8 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold font-heading text-white mb-2">Check Your Email</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            We sent a 6-digit verification code to
          </p>
          <p className="text-teal-400 font-semibold text-sm mt-1">{otpState.maskedEmail}</p>
        </div>

        {/* Demo OTP Banner (when SMTP not configured) */}
        {otpState.demoOtp && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-center">
            <p className="text-amber-400 text-xs font-semibold mb-2 uppercase tracking-wider">⚠ Demo Mode — Email Not Configured</p>
            <p className="text-slate-300 text-xs mb-3">Your one-time login code is (auto-filled below):</p>
            <div className="inline-block bg-slate-950 border-2 border-amber-400/60 rounded-xl px-6 py-3">
              <span className="text-3xl font-mono font-bold tracking-[0.4em] text-amber-300">{otpState.demoOtp}</span>
            </div>
          </div>
        )}

        {/* OTP Input Boxes */}
        <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => inputs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              autoFocus={i === 0}
              className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-slate-950/80 text-white outline-none transition-all
                ${d ? 'border-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.4)]' : 'border-slate-700'}
                focus:border-teal-400 focus:shadow-[0_0_12px_rgba(20,184,166,0.4)]`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Resend success */}
        {resendMsg && !error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 text-sm text-center">
            {resendMsg}
          </div>
        )}

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={loading || digits.join('').length < 6}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold text-base
            hover:from-teal-400 hover:to-cyan-400 transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
        >
          <ShieldCheck className="w-5 h-5" />
          {loading ? 'Verifying...' : 'Verify & Continue'}
        </button>

        {/* Resend & Back */}
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </button>

          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || resending}
            className="flex items-center gap-1.5 text-teal-400 hover:text-teal-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
          </button>
        </div>

        {/* Hint */}
        <p className="text-center text-xs text-slate-600 mt-6">
          ⏰ Code expires in 10 minutes · Check your spam folder if not received
        </p>
      </div>
    </div>
  );
}
