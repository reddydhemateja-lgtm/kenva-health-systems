import React, { useState } from 'react';
import { UserPlus, CheckCircle2, AlertCircle, ArrowRight, Lock, Mail, Phone, Calendar, MapPin, User, KeyRound, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage({ setActiveTab }) {
  const { registerPatient, verifyOtp, resendOtp } = useAuth();
  
  // Registration Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    city: '',
    password: '',
    confirmPassword: ''
  });

  const [step, setStep] = useState('FORM'); // 'FORM' | 'VERIFY_OTP' | 'SUCCESS'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationData, setVerificationData] = useState(null); // { userId, patientId, email, maskedEmail, demoOtp }
  const [otpInput, setOtpInput] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerPatient(formData);
      setVerificationData(res);
      setStep('VERIFY_OTP');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    if (!otpInput || otpInput.trim().length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await verifyOtp(verificationData.userId, otpInput.trim());

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      setStep('SUCCESS');
      setTimeout(() => {
        if (setActiveTab) setActiveTab('patient-dashboard');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!verificationData?.userId) return;
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      const res = await resendOtp(verificationData.userId);
      setResendMsg(res.message || 'A new code has been sent.');
      if (res.demoOtp) {
        setVerificationData(prev => ({ ...prev, demoOtp: res.demoOtp }));
      }
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-fadeIn">
      <div className="glass-panel p-8 sm:p-10 rounded-2xl border border-teal-500/30 shadow-2xl relative overflow-hidden">
        
        {/* Top Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-7 h-7" />
          </div>
          <h2 className="font-heading font-extrabold text-3xl text-white">
            {step === 'VERIFY_OTP' ? 'Verify Your Email' : step === 'SUCCESS' ? 'Account Activated' : 'Patient Registration'}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {step === 'VERIFY_OTP' 
              ? 'Enter the 6-digit one-time code to activate your patient account.'
              : step === 'SUCCESS'
              ? 'Your account is verified and ready. Directing to your patient portal...'
              : 'Create your Kenva Health account to access direct diagnostic appointments and live sample tracking.'}
          </p>
        </div>

        {/* STEP 1: Registration Form */}
        {step === 'FORM' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Full Legal Name *
                </label>
                <div className="flex items-center rounded-xl bg-slate-950/80 border border-slate-700/80 focus-within:border-teal-400 transition-colors overflow-hidden">
                  <div className="px-3.5 py-2.5 text-slate-400 border-r border-slate-800 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Nani Reddem"
                    className="w-full bg-transparent px-3 py-2.5 text-xs text-white focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Email Address *
                </label>
                <div className="flex items-center rounded-xl bg-slate-950/80 border border-slate-700/80 focus-within:border-teal-400 transition-colors overflow-hidden">
                  <div className="px-3.5 py-2.5 text-slate-400 border-r border-slate-800 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="patient@example.com"
                    className="w-full bg-transparent px-3 py-2.5 text-xs text-white focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Phone Number
                </label>
                <div className="flex items-center rounded-xl bg-slate-950/80 border border-slate-700/80 focus-within:border-teal-400 transition-colors overflow-hidden">
                  <div className="px-3.5 py-2.5 text-slate-400 border-r border-slate-800 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full bg-transparent px-3 py-2.5 text-xs text-white focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Date of Birth *
                </label>
                <div className="flex items-center rounded-xl bg-slate-950/80 border border-slate-700/80 focus-within:border-teal-400 transition-colors overflow-hidden">
                  <div className="px-3.5 py-2.5 text-slate-400 border-r border-slate-800 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    name="dob"
                    required
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full bg-transparent px-3 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* City */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  City / Location *
                </label>
                <div className="flex items-center rounded-xl bg-slate-950/80 border border-slate-700/80 focus-within:border-teal-400 transition-colors overflow-hidden">
                  <div className="px-3.5 py-2.5 text-slate-400 border-r border-slate-800 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Tirupati"
                    className="w-full bg-transparent px-3 py-2.5 text-xs text-white focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Password *
                </label>
                <div className="flex items-center rounded-xl bg-slate-950/80 border border-slate-700/80 focus-within:border-teal-400 transition-colors overflow-hidden">
                  <div className="px-3.5 py-2.5 text-slate-400 border-r border-slate-800 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                    className="w-full bg-transparent px-3 py-2.5 text-xs text-white focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Confirm Password *
                </label>
                <div className="flex items-center rounded-xl bg-slate-950/80 border border-slate-700/80 focus-within:border-teal-400 transition-colors overflow-hidden">
                  <div className="px-3.5 py-2.5 text-slate-400 border-r border-slate-800 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="w-full bg-transparent px-3 py-2.5 text-xs text-white focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-teal text-xs w-full py-3 shadow-lg"
              >
                {loading ? 'Creating Account & Generating OTP...' : 'Register Patient Account'}
              </button>
            </div>

            <p className="text-[11px] text-center text-slate-400 pt-2">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-teal-400 font-semibold hover:underline"
              >
                Log in directly
              </button>
            </p>
          </form>
        )}

        {/* STEP 2: Email OTP Verification */}
        {step === 'VERIFY_OTP' && verificationData && (
          <form onSubmit={handleOtpVerify} className="space-y-5 animate-fadeIn">
            {/* Patient ID and Email info */}
            <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-200 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Assigned Patient ID:</span>
                <span className="font-mono font-bold text-teal-300 text-sm">{verificationData.patientId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Verification Sent To:</span>
                <span className="font-semibold text-white">{verificationData.maskedEmail || verificationData.email}</span>
              </div>
            </div>

            {/* Local demo mode helper */}
            {verificationData.demoOtp && (
              <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold block">Demo Environment Active:</span>
                  <span className="text-[11px] text-slate-300">Use verification code: </span>
                  <strong className="font-mono text-sm tracking-wider text-cyan-200">{verificationData.demoOtp}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setOtpInput(verificationData.demoOtp)}
                  className="px-2.5 py-1 text-[11px] bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 rounded border border-cyan-500/40"
                >
                  Auto-fill
                </button>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {resendMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                {resendMsg}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2 text-center">
                Enter 6-Digit OTP Code *
              </label>
              <div className="flex justify-center">
                <input
                  type="text"
                  maxLength="6"
                  required
                  autoFocus
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  className="w-48 text-center text-2xl font-mono tracking-[10px] bg-slate-950/80 border-2 border-teal-500/60 rounded-xl py-3 text-teal-300 focus:outline-none focus:border-teal-400 shadow-inner"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={loading || otpInput.length !== 6}
                className="btn-teal text-xs w-full py-3 shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Code...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Verify Email & Activate Account
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setStep('FORM')}
                  className="text-slate-400 hover:text-white"
                >
                  Back to Registration
                </button>
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResendOtp}
                  className="text-teal-400 font-semibold hover:underline"
                >
                  {resending ? 'Sending...' : 'Resend Code'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 3: Success Screen */}
        {step === 'SUCCESS' && (
          <div className="text-center py-6 space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-heading font-bold text-2xl text-white">Registration & Verification Complete!</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Your email has been verified. Your patient profile is active with immediate booking permissions. A confirmation email has been dispatched.
            </p>
            <div className="pt-4">
              <button
                onClick={() => setActiveTab('patient-dashboard')}
                className="btn-teal text-xs py-3 px-6 inline-flex items-center gap-2"
              >
                Open Patient Portal <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
