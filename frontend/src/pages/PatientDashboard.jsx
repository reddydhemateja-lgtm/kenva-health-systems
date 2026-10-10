import React, { useState, useEffect } from 'react';
import { 
  User, CheckCircle2, AlertCircle, Key, Calendar, Clock, Plus, 
  FlaskConical, FileText, Bell, Sparkles, Building2, MapPin, Download, 
  Check, RefreshCw, ChevronRight, Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import SampleTimeline from '../components/SampleTimeline';
import ReportModal from '../components/ReportModal';

export default function PatientDashboard({ setActiveTab }) {
  const { user, token, setUser } = useAuth();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Code Redemption state
  const [bookingCodeInput, setBookingCodeInput] = useState('');
  const [codeVerifying, setCodeVerifying] = useState(false);
  const [codeMsg, setCodeMsg] = useState({ text: '', isError: false });

  // Book Appointment Modal
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookForm, setBookForm] = useState({
    hospital_id: '',
    preferred_date: '',
    preferred_time: '10:00 AM',
    reason: '',
    symptoms: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Report Modal
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchDashboard = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/patient/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load dashboard.');
      setDashboardData(data);

      // Set default hospital id for booking form
      if (data.hospitals && data.hospitals.length > 0 && !bookForm.hospital_id) {
        setBookForm(prev => ({ ...prev, hospital_id: data.hospitals[0].id }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  // Code Verification Handler
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!bookingCodeInput) return;
    setCodeVerifying(true);
    setCodeMsg({ text: '', isError: false });

    try {
      const res = await fetch('/api/patient/verify-booking-code', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: bookingCodeInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed.');

      // Trigger Confetti Celebration!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setCodeMsg({ text: data.message, isError: false });
      setBookingCodeInput('');
      
      // Update local state and refetch dashboard
      fetchDashboard();
    } catch (err) {
      setCodeMsg({ text: err.message, isError: true });
    } finally {
      setCodeVerifying(false);
    }
  };

  // Submit Appointment Request Handler
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setBookingLoading(true);
    setBookingError('');

    try {
      const res = await fetch('/api/patient/book-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bookForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit appointment request.');

      setIsBookModalOpen(false);
      setBookForm({
        hospital_id: dashboardData?.hospitals?.[0]?.id || '',
        preferred_date: '',
        preferred_time: '10:00 AM',
        reason: '',
        symptoms: ''
      });

      // Refetch
      fetchDashboard();
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  // Mark notification read
  const markNotificationRead = async (notifId) => {
    try {
      await fetch(`/api/patient/notifications/${notifId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => n.id === notifId ? { ...n, is_read: 1 } : n)
      }));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
        <span>Loading your authenticated patient portal...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="glass-panel p-6 rounded-2xl border-rose-500/30 text-center">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h3 className="font-bold text-white text-lg">Dashboard Error</h3>
          <p className="text-xs text-slate-400 mt-1">{error}</p>
          <button onClick={fetchDashboard} className="btn-teal text-xs mt-4">
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const profile = dashboardData?.profile || {};
  const appointments = dashboardData?.appointments || [];
  const testOrders = dashboardData?.testOrders || [];
  const reports = dashboardData?.reports || [];
  const notifications = dashboardData?.notifications || [];
  const hospitals = dashboardData?.hospitals || [];

  const isApproved = profile.approval_status === 'APPROVED';
  const hasBookingPermission = profile.booking_permission === 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Patient Profile Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-teal-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center font-bold text-2xl">
            {profile.name ? profile.name.charAt(0) : 'P'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-extrabold text-2xl text-white">{profile.name}</h2>
              <span className={`badge ${isApproved ? 'badge-approved' : 'badge-pending'}`}>
                {profile.approval_status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Patient ID: <strong className="font-mono text-teal-400">{profile.patient_id}</strong></span>
              <span>City: <strong className="text-slate-200">{profile.city}</strong></span>
              <span>DOB: <strong className="text-slate-200">{profile.dob}</strong></span>
            </p>
          </div>
        </div>

        {/* Action Button: Schedule Appointment */}
        {hasBookingPermission ? (
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="btn-teal text-xs py-3 px-6 shadow-xl"
          >
            <Plus className="w-4 h-4" /> Schedule New Appointment
          </button>
        ) : (
          <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Booking Access Locked</span>
          </div>
        )}
      </div>

      {/* Account Status & Code Verification Banner */}
      {!isApproved ? (
        /* PENDING APPROVAL NOTICE */
        <div className="glass-panel p-6 rounded-2xl border-amber-500/40 bg-amber-500/10 text-amber-200 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Account Pending Administrator Approval</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your account is awaiting administrator approval. You will receive a booking access code after approval.
          </p>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-amber-500/20">
            Tip: You can use the Admin Portal in another tab to approve this account ({profile.patient_id}) and issue a booking code.
          </div>
        </div>
      ) : !hasBookingPermission ? (
        /* APPROVED BUT CODE NOT REDEEMED - UNLOCK BOOKING CARD */
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-teal-500/40 bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Key className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white">
                Unlock Appointment Booking
              </h3>
              <p className="text-xs text-slate-300">
                Your account has been approved by administrator! Enter your unique Booking Access Code below to enable appointment scheduling.
              </p>
            </div>
          </div>

          <form onSubmit={handleVerifyCode} className="flex flex-col sm:flex-row gap-3 max-w-xl">
            <input
              type="text"
              required
              value={bookingCodeInput}
              onChange={(e) => setBookingCodeInput(e.target.value)}
              placeholder="Enter Booking Code (e.g. KEN-CODE-8921-X7)"
              className="glass-input text-xs uppercase font-mono tracking-wider"
            />
            <button
              type="submit"
              disabled={codeVerifying}
              className="btn-teal text-xs py-3 px-6 shrink-0"
            >
              {codeVerifying ? 'Verifying Code...' : 'Verify Code & Unlock'}
            </button>
          </form>

          {codeMsg.text && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              codeMsg.isError ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            }`}>
              {codeMsg.isError ? <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
              <span>{codeMsg.text}</span>
            </div>
          )}
        </div>
      ) : null}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Appointments, Sample Journey, Reports */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. Appointments Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-xl text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-400" /> Appointment Requests & Status
              </h3>
              {hasBookingPermission && (
                <button
                  onClick={() => setIsBookModalOpen(true)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  <Plus className="w-4 h-4" /> Book Appointment
                </button>
              )}
            </div>

            {appointments.length === 0 ? (
              <div className="glass-card p-6 text-center text-xs text-slate-400">
                No appointment requests submitted yet.
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map(apt => (
                  <div key={apt.appointment_id} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal-400">{apt.appointment_id}</span>
                        <span className={`badge ${
                          apt.status === 'CONFIRMED' ? 'badge-approved' : apt.status === 'REJECTED' ? 'badge-rejected' : 'badge-pending'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {apt.preferred_date} at {apt.preferred_time}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-white">{apt.hospitalName}</div>
                    <p className="text-xs text-slate-300"><strong>Reason:</strong> {apt.reason}</p>
                    {apt.symptoms && <p className="text-xs text-slate-400 italic">Symptoms: {apt.symptoms}</p>}
                    {apt.notes && <p className="text-xs text-amber-300/80 bg-amber-500/10 p-2 rounded">Notes: {apt.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Active Test Orders & 10-Stage Sample Timeline */}
          <div className="space-y-4">
            <h3 className="font-heading font-bold text-xl text-white flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-teal-400" /> Active Diagnostic Orders & Sample Tracking
            </h3>

            {testOrders.length === 0 ? (
              <div className="glass-card p-6 text-center text-xs text-slate-400">
                No active test orders or samples found.
              </div>
            ) : (
              <div className="space-y-6">
                {testOrders.map(order => (
                  <div key={order.order_id} className="space-y-4">
                    
                    {/* Order summary card */}
                    <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-cyan-400">{order.order_id}</span>
                          <span className="badge badge-info">{order.status}</span>
                        </div>
                        <h4 className="font-heading font-bold text-base text-white mt-1">{order.test_type}</h4>
                        <p className="text-xs text-slate-400">Physician: {order.ordering_physician} • Facility: {order.hospitalName}</p>
                      </div>

                      {order.report && (
                        <button
                          onClick={() => setSelectedReport(order.report)}
                          className="btn-teal text-xs py-2 px-4 shrink-0"
                        >
                          <FileText className="w-4 h-4" /> View Report
                        </button>
                      )}
                    </div>

                    {/* 10-Stage Interactive Workflow Timeline */}
                    <SampleTimeline sample={order.sample} timeline={order.timeline} />

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Diagnostic Reports Section */}
          <div className="space-y-4">
            <h3 className="font-heading font-bold text-xl text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-400" /> Laboratory Reports & Signed PDFs
            </h3>

            {reports.length === 0 ? (
              <div className="glass-card p-6 text-center text-xs text-slate-400">
                No laboratory reports generated yet.
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map(rep => (
                  <div key={rep.report_id} className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal-400">{rep.report_id}</span>
                        <span className="badge badge-approved">Final Report</span>
                      </div>
                      <h4 className="font-semibold text-white text-sm mt-1">{rep.report_title}</h4>
                      <p className="text-xs text-slate-400">Issued: {new Date(rep.created_at).toLocaleDateString()} • Pathologist: {rep.pathologist_name}</p>
                    </div>

                    <button
                      onClick={() => setSelectedReport(rep)}
                      className="btn-teal text-xs py-2 px-4 shrink-0"
                    >
                      <Download className="w-4 h-4" /> View & Download PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Notifications & Partner Facilities */}
        <div className="space-y-8">
          
          {/* Notifications Card */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-teal-400" /> Portal Notifications
            </h3>

            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400">No notifications.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {notifications.map(n => (
                  <div 
                    key={n.id} 
                    className={`p-3.5 rounded-xl border text-xs space-y-1 transition-all ${
                      n.is_read ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-teal-500/10 border-teal-500/30 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className={n.is_read ? 'text-slate-300' : 'text-teal-400'}>{n.title}</span>
                      {!n.is_read && (
                        <button
                          onClick={() => markNotificationRead(n.id)}
                          className="text-[10px] text-teal-300 hover:underline flex items-center gap-0.5"
                        >
                          <Check className="w-3 h-3" /> Mark Read
                        </button>
                      )}
                    </div>
                    <p className="leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hospitals Facility List Card */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-400" /> Network Partner Facilities
            </h3>

            <div className="space-y-3">
              {hospitals.map(h => (
                <div key={h.id} className="glass-card p-3.5 rounded-xl border border-slate-800/80 text-xs">
                  <div className="font-semibold text-white">{h.name}</div>
                  <div className="text-slate-400 flex items-start gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                    <span>{h.address}</span>
                  </div>
                  <div className="text-teal-400 text-[10px] mt-1 font-mono">{h.accreditation}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Book Appointment Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-2xl border border-teal-500/30 shadow-2xl relative">
            <h3 className="font-heading font-bold text-xl text-white mb-4">
              Schedule Diagnostic Appointment
            </h3>

            {bookingError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Select Hospital Facility *</label>
                <select
                  required
                  value={bookForm.hospital_id}
                  onChange={(e) => setBookForm({ ...bookForm, hospital_id: e.target.value })}
                  className="glass-input text-xs text-slate-200 bg-slate-900"
                >
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id} className="bg-slate-900 text-white">
                      {h.name} ({h.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Preferred Date *</label>
                  <input
                    type="date"
                    required
                    value={bookForm.preferred_date}
                    onChange={(e) => setBookForm({ ...bookForm, preferred_date: e.target.value })}
                    className="glass-input text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Preferred Time *</label>
                  <select
                    value={bookForm.preferred_time}
                    onChange={(e) => setBookForm({ ...bookForm, preferred_time: e.target.value })}
                    className="glass-input text-xs text-slate-200 bg-slate-900"
                  >
                    <option value="08:30 AM" className="bg-slate-900">08:30 AM</option>
                    <option value="09:30 AM" className="bg-slate-900">09:30 AM</option>
                    <option value="10:30 AM" className="bg-slate-900">10:30 AM</option>
                    <option value="02:00 PM" className="bg-slate-900">02:00 PM</option>
                    <option value="04:00 PM" className="bg-slate-900">04:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Reason for Appointment *</label>
                <input
                  type="text"
                  required
                  value={bookForm.reason}
                  onChange={(e) => setBookForm({ ...bookForm, reason: e.target.value })}
                  placeholder="e.g. Annual Diabetes Screening & Comprehensive Metabolic Panel"
                  className="glass-input text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Optional Symptoms / Notes</label>
                <textarea
                  rows="2"
                  value={bookForm.symptoms}
                  onChange={(e) => setBookForm({ ...bookForm, symptoms: e.target.value })}
                  placeholder="Brief description of any symptoms or fasting notes"
                  className="glass-input text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="btn-secondary text-xs w-1/2 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="btn-teal text-xs w-1/2 py-2.5"
                >
                  {bookingLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Report Preview Modal */}
      <ReportModal
        report={selectedReport}
        patient={{ name: profile.name, dob: profile.dob, city: profile.city }}
        hospital={hospitals.find(h => h.id === selectedReport?.hospital_id)}
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
      />

    </div>
  );
}
