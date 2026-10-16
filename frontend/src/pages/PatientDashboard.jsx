import React, { useState, useEffect } from 'react';
import { 
  User, CheckCircle2, AlertCircle, Calendar, Clock, Plus, 
  FlaskConical, FileText, Bell, Building2, MapPin, Download, 
  Check, RefreshCw, ChevronRight, Activity, Phone, ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLiveSync } from '../context/useLiveSync';
import SampleTimeline from '../components/SampleTimeline';
import ReportModal from '../components/ReportModal';

export default function PatientDashboard({ setActiveTab }) {
  const { user, token } = useAuth();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Book Appointment Modal
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookForm, setBookForm] = useState({
    hospital_id: '',
    test_type: 'Comprehensive Metabolic Panel (CMP)',
    preferred_date: '',
    preferred_time: '09:30 AM',
    reason: '',
    symptoms: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('');

  // Report Modal
  const [selectedReport, setSelectedReport] = useState(null);

  // Available tests catalog
  const availableServices = [
    { code: 'CMP', name: 'Comprehensive Metabolic Panel (CMP)', category: 'Biochemistry', duration: '24h' },
    { code: 'CBC', name: 'Complete Blood Count (CBC) with Differential', category: 'Hematology', duration: '12h' },
    { code: 'LIPID', name: 'Lipid Profile & Atherogenic Index', category: 'Cardiology', duration: '24h' },
    { code: 'HBA1C', name: 'Glycated Hemoglobin (HbA1c) & Fasting Plasma Glucose', category: 'Diabetes Screening', duration: '12h' },
    { code: 'LFT', name: 'Liver Function Test (LFT) Panel', category: 'Hepatic Function', duration: '24h' },
    { code: 'KFT', name: 'Renal Function & Electrolyte Profile (KFT/RFT)', category: 'Nephrology', duration: '24h' },
    { code: 'THYROID', name: 'Comprehensive Thyroid Panel (TSH, Free T3, Free T4)', category: 'Endocrinology', duration: '24h' },
    { code: 'VITAMIN', name: 'Vitamin D (25-OH) & Vitamin B12 Immunoassay', category: 'Micronutrients', duration: '36h' },
    { code: 'CARDIAC', name: 'High-Sensitivity Troponin-I & hs-CRP Cardiac Markers', category: 'Cardiology', duration: '6h' }
  ];

  const fetchDashboard = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/patient/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load dashboard.');
      setDashboardData(data);

      // Set default hospital id for booking form if not yet chosen
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

  // Live real-time synchronization via SSE and polling fallback (3s)
  useLiveSync(() => {
    fetchDashboard();
  }, { pollIntervalMs: 3000, enabled: !!token });

  // Submit Appointment Request Handler
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setBookingLoading(true);
    setBookingError('');
    setBookingSuccessMsg('');

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

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });

      setBookingSuccessMsg(`Appointment ${data.appointmentId} booked successfully!`);
      setTimeout(() => {
        setIsBookModalOpen(false);
        setBookingSuccessMsg('');
      }, 1500);

      // Refresh dashboard
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
        notifications: (prev?.notifications || []).map(n => n.id === notifId ? { ...n, is_read: 1 } : n)
      }));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
        <span>Loading live patient portal...</span>
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

  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Patient Profile Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-teal-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center font-bold text-2xl">
            {profile.name ? profile.name.charAt(0) : 'P'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-extrabold text-2xl text-white">{profile.name}</h2>
              <span className="badge badge-approved flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verified Patient
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Patient ID: <strong className="font-mono text-teal-400">{profile.patient_id}</strong></span>
              <span>City: <strong className="text-slate-200">{profile.city || 'Tirupati'}</strong></span>
              <span>DOB: <strong className="text-slate-200">{profile.dob}</strong></span>
            </p>
          </div>
        </div>

        {/* Action Button: Book Appointment */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="btn-teal text-xs py-3 px-6 shadow-xl flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Book Diagnostic Appointment
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Sample Journey, Appointments, Reports */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. Live Sample Tracking & 11-Stage Journey (Top Priority) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-xl text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-400 animate-pulse" /> Live Sample Tracking & Journey
              </h3>
              <span className="text-xs text-teal-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping inline-block"></span> Real-Time Connected
              </span>
            </div>

            {testOrders.length === 0 ? (
              <div className="glass-card p-6 text-center text-xs text-slate-400 rounded-xl border border-slate-800">
                <FlaskConical className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                No active diagnostic orders currently registered. Book an appointment below to initiate your diagnostic workflow.
              </div>
            ) : (
              <div className="space-y-6">
                {testOrders.map(order => (
                  <div key={order.order_id} className="space-y-4">
                    
                    {/* Order summary card */}
                    <div className="glass-card p-5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-cyan-400">{order.order_id}</span>
                          <span className="badge badge-info">{order.status}</span>
                        </div>
                        <h4 className="font-heading font-bold text-base text-white mt-1">{order.test_type}</h4>
                        <p className="text-xs text-slate-400">
                          Ordering Physician: <strong className="text-slate-300">{order.ordering_physician}</strong> • Facility: <strong className="text-slate-300">{order.hospitalName}</strong>
                        </p>
                      </div>

                      {order.report && (
                        <button
                          onClick={() => setSelectedReport(order.report)}
                          className="btn-teal text-xs py-2 px-4 shrink-0 flex items-center gap-1.5"
                        >
                          <FileText className="w-4 h-4" /> View Final Report
                        </button>
                      )}
                    </div>

                    {/* 11-Stage Interactive Workflow Timeline */}
                    <SampleTimeline 
                      sample={order.sample} 
                      timeline={order.timeline} 
                      onDownloadReport={() => {
                        if (order.report) setSelectedReport(order.report);
                      }}
                    />

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Appointments Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-xl text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-400" /> Diagnostic Appointments
              </h3>
              <button
                onClick={() => setIsBookModalOpen(true)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                <Plus className="w-3.5 h-3.5" /> Book Another
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className="glass-card p-6 text-center text-xs text-slate-400 rounded-xl border border-slate-800">
                No appointment requests submitted yet. Click above to schedule your first appointment.
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map(apt => (
                  <div key={apt.appointment_id} className="glass-card p-5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal-400">{apt.appointment_id}</span>
                        <span className={`badge ${
                          apt.status === 'CONFIRMED' || apt.status === 'COMPLETED' ? 'badge-approved' : apt.status === 'REJECTED' || apt.status === 'CANCELLED' ? 'badge-rejected' : 'badge-pending'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-teal-400" />
                        {apt.preferred_date} at {apt.preferred_time}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-white">{apt.hospitalName || 'Partner Facility'}</div>
                    <p className="text-xs text-slate-300">
                      <strong>Requested Service:</strong> {apt.test_type || apt.reason}
                    </p>
                    {apt.symptoms && (
                      <p className="text-xs text-slate-400 italic">Clinical Notes: {apt.symptoms}</p>
                    )}
                    {apt.notes && (
                      <p className="text-xs text-cyan-300/90 bg-cyan-950/40 p-2.5 rounded-lg border border-cyan-800/40">
                        Facility Update: {apt.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Diagnostic Reports Section */}
          <div className="space-y-4">
            <h3 className="font-heading font-bold text-xl text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-400" /> Published Laboratory Reports
            </h3>

            {reports.length === 0 ? (
              <div className="glass-card p-6 text-center text-xs text-slate-400 rounded-xl border border-slate-800">
                No reports generated yet. Reports will appear automatically once testing and pathologist verification complete.
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map(rep => (
                  <div key={rep.report_id || rep.id} className="glass-card p-5 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal-400">{rep.report_id}</span>
                        <span className="badge badge-approved">Digitally Signed</span>
                      </div>
                      <h4 className="font-semibold text-white text-sm mt-1">{rep.test_type || rep.report_title}</h4>
                      <p className="text-xs text-slate-400">
                        Issued: {new Date(rep.created_at).toLocaleDateString()} • Pathologist: {rep.pathologist_name}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedReport(rep)}
                      className="btn-teal text-xs py-2 px-4 shrink-0 flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" /> View & Download PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: In-App Notifications & Network Hospitals */}
        <div className="space-y-8">
          
          {/* Notifications Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-teal-400" /> Activity Notifications
              </h3>
              {unreadNotificationsCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[11px] font-bold">
                  {unreadNotificationsCount} new
                </span>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400">No notifications at this time.</p>
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
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-400" /> Accredited Partner Facilities
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
            <h3 className="font-heading font-bold text-xl text-white mb-1">
              Book Diagnostic Appointment
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Select your preferred accredited hospital facility, test type, date, and appointment slot.
            </p>

            {bookingSuccessMsg && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{bookingSuccessMsg}</span>
              </div>
            )}

            {bookingError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleBookAppointment} className="space-y-4">
              {/* Select Hospital */}
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

              {/* Select Test / Service */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Diagnostic Test or Panel *</label>
                <select
                  required
                  value={bookForm.test_type}
                  onChange={(e) => setBookForm({ ...bookForm, test_type: e.target.value })}
                  className="glass-input text-xs text-slate-200 bg-slate-900"
                >
                  {availableServices.map(srv => (
                    <option key={srv.code} value={srv.name} className="bg-slate-900 text-white">
                      {srv.name} ({srv.category} - {srv.duration})
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
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Time Slot *</label>
                  <select
                    value={bookForm.preferred_time}
                    onChange={(e) => setBookForm({ ...bookForm, preferred_time: e.target.value })}
                    className="glass-input text-xs text-slate-200 bg-slate-900"
                  >
                    <option value="08:30 AM" className="bg-slate-900">08:30 AM (Fasting)</option>
                    <option value="09:30 AM" className="bg-slate-900">09:30 AM</option>
                    <option value="10:30 AM" className="bg-slate-900">10:30 AM</option>
                    <option value="11:30 AM" className="bg-slate-900">11:30 AM</option>
                    <option value="02:30 PM" className="bg-slate-900">02:30 PM</option>
                    <option value="04:30 PM" className="bg-slate-900">04:30 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Reason / Clinical Context</label>
                <input
                  type="text"
                  value={bookForm.reason}
                  onChange={(e) => setBookForm({ ...bookForm, reason: e.target.value })}
                  placeholder="e.g. Routine metabolic checkup or doctor referral"
                  className="glass-input text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Optional Symptoms / Notes</label>
                <textarea
                  rows="2"
                  value={bookForm.symptoms}
                  onChange={(e) => setBookForm({ ...bookForm, symptoms: e.target.value })}
                  placeholder="Any symptoms, medications, or fasting notes"
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
                  className="btn-teal text-xs w-1/2 py-2.5 flex items-center justify-center gap-1.5"
                >
                  {bookingLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
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
