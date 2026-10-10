import React, { useState } from 'react';
import { UserPlus, CheckCircle2, AlertCircle, ArrowRight, Lock, Mail, Phone, Calendar, MapPin, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage({ setActiveTab }) {
  const { registerPatient } = useAuth();
  
  // Clean empty initial state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    city: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
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
      setSuccessData(res);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-fadeIn">
      <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-teal-500/30 shadow-2xl relative overflow-hidden">
        
        {/* Top Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-7 h-7" />
          </div>
          <h2 className="font-heading font-extrabold text-3xl text-white">
            Patient Registration
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Create your Kenva Health account to start diagnostic sample coordination.
          </p>
        </div>

        {/* Success State */}
        {successData ? (
          <div className="space-y-6 text-center py-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-heading font-bold text-2xl text-white">Registration Submitted!</h3>
              <p className="text-xs text-slate-400 mt-1">Your assigned Patient ID:</p>
              <div className="inline-block mt-2 px-4 py-2 rounded-xl bg-teal-500/10 border border-teal-500/30 font-mono font-bold text-xl text-teal-300">
                {successData.patientId}
              </div>
            </div>

            {/* Pending Notice Box */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-left leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-400">
                <AlertCircle className="w-4 h-4 shrink-0" /> Account Status: Pending Approval
              </div>
              <p>
                {successData.notice}
              </p>
              <p className="mt-2 text-[11px] text-slate-300">
                You can log in now to view your patient profile status. Once an administrator approves your profile, your unique one-time booking access code will appear in your portal.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setActiveTab('login')}
                className="btn-teal text-xs w-full py-3"
              >
                Proceed to Patient Login <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Registration Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            
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
                    placeholder="nani.reddy@example.com"
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
                {loading ? 'Generating Patient Account...' : 'Complete Patient Registration'}
              </button>
            </div>

            <p className="text-[11px] text-center text-slate-400 pt-2">
              Already registered?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-teal-400 font-semibold hover:underline"
              >
                Log in to Patient Portal
              </button>
            </p>

          </form>
        )}

      </div>
    </div>
  );
}
