import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Users, Clock, CheckCircle2, Calendar, FlaskConical, 
  Truck, Activity, FileText, AlertTriangle, Building2, Key, Mail, 
  Search, RefreshCw, Plus, ArrowRight, Eye, Check, X, Shield, Lock, Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SampleTimeline from '../components/SampleTimeline';

export default function AdminDashboard() {
  const { user, token } = useAuth();

  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [sampleJourney, setSampleJourney] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [emailConfig, setEmailConfig] = useState(null);

  const [activeTab, setActiveTab] = useState('registrations');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Approval Modal state
  const [approvalModalPatient, setApprovalModalPatient] = useState(null);
  const [generatedCodeResult, setGeneratedCodeResult] = useState(null);
  const [approving, setApproving] = useState(false);

  // Reset Password Modal state
  const [resetPasswordPatient, setResetPasswordPatient] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  // Reject Modal state
  const [rejectModalPatient, setRejectModalPatient] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Add Hospital Modal
  const [isAddHospitalOpen, setIsAddHospitalOpen] = useState(false);
  const [hospitalForm, setHospitalForm] = useState({
    name: 'Apex Diagnostic Center',
    code: 'APEX',
    city: 'Tirupati, AP',
    address: 'Near MR Palli, Renigunta Road, Tirupati, AP 517501',
    contact_email: 'info@apex.kenva.local',
    contact_phone: '+91 877 2299004',
    accreditation: 'NABL & NABH Accredited Facility'
  });

  // Email Config Form
  const [emailForm, setEmailForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    from_email: '',
    is_enabled: false
  });
  const [emailSaveMsg, setEmailSaveMsg] = useState('');

  const fetchAdminData = async () => {
    if (!token) return;
    try {
      const [sRes, pRes, aRes, hRes, jRes, logRes, eRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/patients', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/appointments', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/hospitals', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/sample-journey', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/email-config', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const sData = await sRes.json();
      const pData = await pRes.json();
      const aData = await aRes.json();
      const hData = await hRes.json();
      const jData = await jRes.json();
      const logData = await logRes.json();
      const eData = await eRes.json();

      setStats(sData);
      setPatients(pData);
      setAppointments(aData);
      setHospitals(hData);
      setSampleJourney(jData);
      setAuditLogs(logData);
      setEmailConfig(eData);

      setEmailForm({
        smtp_host: eData.smtp_host || '',
        smtp_port: eData.smtp_port || 587,
        smtp_user: eData.smtp_user || '',
        smtp_pass: '',
        from_email: eData.from_email || '',
        is_enabled: !!eData.is_enabled
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  // Approve Patient & Generate Code
  const handleApprovePatient = async (patientId) => {
    setApproving(true);
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Approval failed.');

      setGeneratedCodeResult(resData);
      fetchAdminData();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  // Reset Patient Password Handler
  const handleResetPatientPassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordPatient || !newPasswordInput) return;

    try {
      const res = await fetch(`/api/admin/patients/${resetPasswordPatient.patient_id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: newPasswordInput })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Reset password failed.');

      setResetMsg(resData.message);
      setNewPasswordInput('');
      fetchAdminData();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Reject Patient
  const handleRejectPatient = async (e) => {
    e.preventDefault();
    if (!rejectModalPatient) return;

    try {
      const res = await fetch(`/api/admin/patients/${rejectModalPatient.patient_id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: rejectReason })
      });
      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.error || 'Rejection failed.');
      }
      setRejectModalPatient(null);
      setRejectReason('');
      fetchAdminData();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Add Hospital
  const handleAddHospital = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/hospitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(hospitalForm)
      });
      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.error || 'Failed to add hospital.');
      }
      setIsAddHospitalOpen(false);
      fetchAdminData();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Save Email Config
  const handleSaveEmailConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/email-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(emailForm)
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Save failed.');

      setEmailSaveMsg(resData.message);
      fetchAdminData();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
        <span>Loading administrator portal data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="glass-panel p-6 rounded-2xl border-rose-500/30 text-center">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h3 className="font-bold text-white text-lg">Admin Portal Error</h3>
          <p className="text-xs text-slate-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const pendingPatients = patients.filter(p => p.approval_status === 'PENDING_APPROVAL');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden bg-[#111d38]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center font-bold">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-extrabold text-2xl text-white">Kenva Health Systems Admin</h2>
              <span className="badge badge-pending border-purple-500/30 text-purple-300 bg-purple-500/10">Global System Control</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Master Administrator • Network Status: <strong className="text-emerald-400 font-semibold">ALL SYSTEMS OPERATIONAL</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddHospitalOpen(true)}
            className="btn-teal text-xs py-2.5 px-4 bg-purple-600 hover:bg-purple-500 shadow-xl"
          >
            <Plus className="w-4 h-4" /> Add Partner Hospital
          </button>
        </div>
      </div>

      {/* 10 KPI Dashboard Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="glass-card p-4 rounded-2xl border border-slate-700 bg-slate-800/90">
          <div className="text-[11px] text-slate-300 font-semibold">Total Patients</div>
          <div className="font-heading font-extrabold text-2xl text-white mt-1">{stats?.totalPatients || 0}</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-700 bg-slate-800/90">
          <div className="text-[11px] text-amber-400 font-semibold">Pending Registrations</div>
          <div className="font-heading font-extrabold text-2xl text-amber-300 mt-1">{stats?.pendingRegistrations || 0}</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-700 bg-slate-800/90">
          <div className="text-[11px] text-emerald-400 font-semibold">Approved Accounts</div>
          <div className="font-heading font-extrabold text-2xl text-emerald-300 mt-1">{stats?.approvedAccounts || 0}</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-700 bg-slate-800/90">
          <div className="text-[11px] text-cyan-400 font-semibold">Pending Appointments</div>
          <div className="font-heading font-extrabold text-2xl text-cyan-300 mt-1">{stats?.pendingAppointments || 0}</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-700 bg-slate-800/90">
          <div className="text-[11px] text-teal-400 font-semibold">Confirmed Appointments</div>
          <div className="font-heading font-extrabold text-2xl text-teal-300 mt-1">{stats?.confirmedAppointments || 0}</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-700 bg-slate-800/90">
          <div className="text-[11px] text-blue-400 font-semibold">Active Test Orders</div>
          <div className="font-heading font-extrabold text-2xl text-blue-300 mt-1">{stats?.activeTestOrders || 0}</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-700 bg-slate-800/90">
          <div className="text-[11px] text-purple-400 font-semibold">Samples in Transit</div>
          <div className="font-heading font-extrabold text-2xl text-purple-300 mt-1">{stats?.samplesInTransit || 0}</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-700 bg-slate-800/90">
          <div className="text-[11px] text-yellow-400 font-semibold">Tests in Progress</div>
          <div className="font-heading font-extrabold text-2xl text-yellow-300 mt-1">{stats?.testsInProgress || 0}</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-700 bg-slate-800/90">
          <div className="text-[11px] text-emerald-400 font-semibold">Completed Reports</div>
          <div className="font-heading font-extrabold text-2xl text-emerald-300 mt-1">{stats?.completedReports || 0}</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-700 bg-slate-800/90">
          <div className="text-[11px] text-rose-400 font-semibold">Delayed Records</div>
          <div className="font-heading font-extrabold text-2xl text-rose-400 mt-1">{stats?.delayedRecords || 0}</div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('registrations')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'registrations' ? 'bg-purple-600 text-white font-bold shadow-lg' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Patient Accounts & Password Management ({pendingPatients.length} Pending)
        </button>

        <button
          onClick={() => setActiveTab('codes')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'codes' ? 'bg-purple-600 text-white font-bold shadow-lg' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Key className="w-4 h-4" /> Booking Access Codes
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'appointments' ? 'bg-purple-600 text-white font-bold shadow-lg' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" /> Appointments Queue
        </button>

        <button
          onClick={() => setActiveTab('journey')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'journey' ? 'bg-purple-600 text-white font-bold shadow-lg' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <FlaskConical className="w-4 h-4" /> 10-Stage Sample Journeys
        </button>

        <button
          onClick={() => setActiveTab('hospitals')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'hospitals' ? 'bg-purple-600 text-white font-bold shadow-lg' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" /> Partner Hospitals ({hospitals.length})
        </button>

        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'email' ? 'bg-purple-600 text-white font-bold shadow-lg' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Mail className="w-4 h-4" /> Email Provider
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'audit' ? 'bg-purple-600 text-white font-bold shadow-lg' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" /> Audit Logs
        </button>
      </div>

      {/* TAB 1: PATIENT REGISTRATIONS & PASSWORD MANAGEMENT */}
      {activeTab === 'registrations' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-xl text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" /> Patient Registrations & Account Management
            </h3>
            <span className="text-xs text-slate-300">Total: {patients.length} Registered</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 uppercase font-semibold border-b border-slate-700">
                <tr>
                  <th className="p-3">Patient ID</th>
                  <th className="p-3">Full Name & Email</th>
                  <th className="p-3">City & DOB</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Active Booking Code</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/60">
                {patients.map(pat => (
                  <tr key={pat.patient_id} className="hover:bg-slate-900/60">
                    <td className="p-3 font-mono font-bold text-teal-400">{pat.patient_id}</td>
                    <td className="p-3">
                      <div className="font-bold text-white text-sm">{pat.name}</div>
                      <div className="text-slate-300">{pat.email}</div>
                    </td>
                    <td className="p-3 text-slate-300">
                      {pat.city} ({pat.dob})
                    </td>
                    <td className="p-3">
                      <span className={`badge ${
                        pat.approval_status === 'APPROVED' ? 'badge-approved' : pat.approval_status === 'REJECTED' ? 'badge-rejected' : 'badge-pending'
                      }`}>
                        {pat.approval_status}
                      </span>
                    </td>
                    <td className="p-3 font-mono">
                      {pat.booking_codes && pat.booking_codes.length > 0 ? (
                        <span className="text-teal-300 font-bold bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                          {pat.booking_codes[0].code} {pat.booking_codes[0].is_redeemed ? '(Redeemed)' : '(Active)'}
                        </span>
                      ) : (
                        <span className="text-slate-500">None Issued</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {pat.approval_status === 'PENDING_APPROVAL' && (
                        <>
                          <button
                            onClick={() => {
                              setApprovalModalPatient(pat);
                              setGeneratedCodeResult(null);
                            }}
                            className="btn-teal text-[11px] py-1 px-2.5 bg-purple-600 hover:bg-purple-500"
                          >
                            <Check className="w-3 h-3" /> Approve & Issue Code
                          </button>

                          <button
                            onClick={() => {
                              setRejectModalPatient(pat);
                              setRejectReason('');
                            }}
                            className="btn-secondary text-[11px] py-1 px-2.5 text-rose-400"
                          >
                            <X className="w-3 h-3" /> Reject
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => {
                          setResetPasswordPatient(pat);
                          setNewPasswordInput('');
                          setResetMsg('');
                        }}
                        className="btn-secondary text-[11px] py-1 px-2.5 text-cyan-300 hover:text-white"
                        title="Change or reset patient password"
                      >
                        <Lock className="w-3 h-3" /> Change Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: BOOKING ACCESS CODES */}
      {activeTab === 'codes' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <h3 className="font-heading font-bold text-xl text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-400" /> Generated Booking Access Codes Log
          </h3>

          <div className="overflow-x-auto rounded-2xl border border-slate-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 uppercase font-semibold border-b border-slate-700">
                <tr>
                  <th className="p-3">Booking Code</th>
                  <th className="p-3">Patient ID</th>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Redemption Status</th>
                  <th className="p-3">Expires On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/60">
                {patients.flatMap(p => (p.booking_codes || []).map(c => ({ ...c, patientName: p.name, patientId: p.patient_id }))).map((c, i) => (
                  <tr key={i} className="hover:bg-slate-900/60">
                    <td className="p-3 font-mono font-bold text-teal-300 text-sm">{c.code}</td>
                    <td className="p-3 font-mono text-cyan-400">{c.patientId}</td>
                    <td className="p-3 text-white font-semibold">{c.patientName}</td>
                    <td className="p-3">
                      {c.is_redeemed ? (
                        <span className="badge badge-approved">Redeemed</span>
                      ) : (
                        <span className="badge badge-pending">Active / Unredeemed</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-300 font-mono">{new Date(c.expires_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: GLOBAL APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <h3 className="font-heading font-bold text-xl text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" /> Global Appointments Monitoring
          </h3>

          <div className="overflow-x-auto rounded-2xl border border-slate-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 uppercase font-semibold border-b border-slate-700">
                <tr>
                  <th className="p-3">Appointment ID</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Hospital Facility</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/60">
                {appointments.map(apt => (
                  <tr key={apt.appointment_id} className="hover:bg-slate-900/60">
                    <td className="p-3 font-mono font-bold text-cyan-400">{apt.appointment_id}</td>
                    <td className="p-3 font-semibold text-white">{apt.patientName} ({apt.patient_id})</td>
                    <td className="p-3 text-slate-300">{apt.hospitalName}</td>
                    <td className="p-3 text-slate-300">{apt.preferred_date} at {apt.preferred_time}</td>
                    <td className="p-3 text-slate-300 max-w-xs">{apt.reason}</td>
                    <td className="p-3">
                      <span className={`badge ${
                        apt.status === 'CONFIRMED' ? 'badge-approved' : apt.status === 'REJECTED' ? 'badge-rejected' : 'badge-pending'
                      }`}>
                        {apt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: 10-STAGE SAMPLE JOURNEYS */}
      {activeTab === 'journey' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <h3 className="font-heading font-bold text-xl text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-purple-400" /> Global Sample Journeys & LIMS Telemetry
          </h3>

          <div className="space-y-6">
            {sampleJourney.map(item => (
              <div key={item.order_id} className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">{item.order_id}</span>
                      <span className="badge badge-info">{item.orderStatus}</span>
                      <span className="text-xs text-slate-300">Patient: <strong className="text-white">{item.patientName}</strong></span>
                    </div>
                    <h4 className="font-bold text-white text-base mt-1">{item.test_type}</h4>
                    <p className="text-xs text-slate-300">Physician: {item.ordering_physician} • Facility: {item.hospitalName}</p>
                  </div>
                </div>

                {item.sample ? (
                  <SampleTimeline sample={item.sample} timeline={item.timeline} />
                ) : (
                  <p className="text-xs text-slate-400 italic">No specimen barcode registered for this order yet.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: HOSPITALS MANAGEMENT */}
      {activeTab === 'hospitals' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-xl text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" /> Partner Hospital Facilities
            </h3>
            <button
              onClick={() => setIsAddHospitalOpen(true)}
              className="btn-teal text-xs py-2 px-4 bg-purple-600 hover:bg-purple-500"
            >
              <Plus className="w-4 h-4" /> Add Partner Hospital
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hospitals.map(h => (
              <div key={h.id} className="glass-card p-5 rounded-2xl border border-slate-700 bg-slate-800/90 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-teal-400">{h.code}</span>
                  <span className="badge badge-info">Partner Center</span>
                </div>
                <h4 className="font-heading font-bold text-base text-white">{h.name}</h4>
                <p className="text-xs text-slate-300">{h.address}</p>
                <p className="text-xs text-slate-300">Email: {h.contact_email} • Phone: {h.contact_phone}</p>
                <div className="pt-2 text-[10px] text-teal-300 font-mono">{h.accreditation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: EMAIL CONFIGURATION SETUP */}
      {activeTab === 'email' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-2xl mx-auto space-y-6 bg-[#111d38]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-xl text-white">
                Email Notification Provider Setup
              </h3>
              <p className="text-xs text-slate-300">
                Configure SMTP server for real email delivery (e.g. SendGrid, Mailgun, AWS SES, or Gmail SMTP).
              </p>
            </div>
          </div>

          {!emailConfig?.is_enabled && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed">
              <strong className="block font-bold text-amber-400 mb-1">Email Delivery Notice:</strong>
              SMTP email provider is currently NOT enabled. Notifications for patient registrations, booking codes, appointment status changes, and reports are safely routed to in-app portal notifications.
            </div>
          )}

          {emailSaveMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{emailSaveMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveEmailConfig} className="space-y-4 text-xs">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <input
                type="checkbox"
                id="is_enabled"
                checked={emailForm.is_enabled}
                onChange={(e) => setEmailForm({ ...emailForm, is_enabled: e.target.checked })}
                className="w-4 h-4 accent-purple-500 rounded"
              />
              <label htmlFor="is_enabled" className="font-semibold text-white cursor-pointer">
                Enable Outbound SMTP Email Notifications
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">SMTP Host</label>
                <input
                  type="text"
                  value={emailForm.smtp_host}
                  onChange={(e) => setEmailForm({ ...emailForm, smtp_host: e.target.value })}
                  placeholder="smtp.sendgrid.net"
                  className="glass-input text-xs"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">SMTP Port</label>
                <input
                  type="number"
                  value={emailForm.smtp_port}
                  onChange={(e) => setEmailForm({ ...emailForm, smtp_port: e.target.value })}
                  placeholder="587"
                  className="glass-input text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">SMTP Username / API Key</label>
                <input
                  type="text"
                  value={emailForm.smtp_user}
                  onChange={(e) => setEmailForm({ ...emailForm, smtp_user: e.target.value })}
                  placeholder="apikey"
                  className="glass-input text-xs"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">SMTP Password</label>
                <input
                  type="password"
                  value={emailForm.smtp_pass}
                  onChange={(e) => setEmailForm({ ...emailForm, smtp_pass: e.target.value })}
                  placeholder="••••••••••••"
                  className="glass-input text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">From Email Address</label>
              <input
                type="email"
                value={emailForm.from_email}
                onChange={(e) => setEmailForm({ ...emailForm, from_email: e.target.value })}
                placeholder="notifications@kenva.health.local"
                className="glass-input text-xs"
              />
            </div>

            <button
              type="submit"
              className="btn-teal text-xs w-full py-3 bg-purple-600 hover:bg-purple-500"
            >
              Save Email Configuration
            </button>
          </form>
        </div>
      )}

      {/* TAB 7: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <h3 className="font-heading font-bold text-xl text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" /> Immutable System Audit Trail
          </h3>

          <div className="overflow-x-auto rounded-2xl border border-slate-700 max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 uppercase font-semibold border-b border-slate-700 sticky top-0">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor & Role</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Target</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/60">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-900/60">
                    <td className="p-3 font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3">
                      <div className="font-semibold text-white">{log.actor_name}</div>
                      <div className="text-[10px] text-purple-300 font-mono">{log.actor_role}</div>
                    </td>
                    <td className="p-3 font-bold text-teal-300 font-mono">{log.action}</td>
                    <td className="p-3 font-mono text-cyan-400">{log.target_type}: {log.target_id}</td>
                    <td className="p-3 text-slate-300 text-[11px] max-w-xs truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: APPROVE PATIENT & SHOW BOOKING CODE */}
      {approvalModalPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-2xl border border-purple-500/30 shadow-2xl relative bg-[#0b132b]">
            
            <button
              onClick={() => {
                setApprovalModalPatient(null);
                setGeneratedCodeResult(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {generatedCodeResult ? (
              <div className="space-y-6 text-center py-2 animate-fadeIn">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="font-heading font-bold text-xl text-white">Patient Account Approved!</h3>
                  <p className="text-xs text-slate-300 mt-1">Generated Unpredictable One-Time Booking Access Code:</p>
                  
                  <div className="mt-3 p-4 rounded-xl bg-teal-500/10 border-2 border-dashed border-teal-500/40 text-center">
                    <div className="font-mono font-extrabold text-2xl text-teal-300 tracking-wider">
                      {generatedCodeResult.bookingCode}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Expires on: {new Date(generatedCodeResult.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 text-left space-y-1">
                  <div>• Code associated with Patient ID: <strong className="font-mono text-teal-400">{generatedCodeResult.patientId}</strong></div>
                  <div>• Notification status: <strong className="text-emerald-400">Delivered to patient portal</strong></div>
                </div>

                <button
                  onClick={() => {
                    setApprovalModalPatient(null);
                    setGeneratedCodeResult(null);
                  }}
                  className="btn-teal text-xs w-full py-3"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-heading font-bold text-xl text-white">Approve Patient Account</h3>
                <p className="text-xs text-slate-300">
                  You are approving <strong className="text-white">{approvalModalPatient.name}</strong> (ID: <span className="font-mono text-teal-400">{approvalModalPatient.patient_id}</span>).
                </p>
                <p className="text-xs text-slate-400">
                  Approving this account will generate a unique unpredictable booking access code and publish it inside the patient's authenticated portal.
                </p>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setApprovalModalPatient(null)}
                    className="btn-secondary text-xs w-1/2 py-2.5"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => handleApprovePatient(approvalModalPatient.patient_id)}
                    disabled={approving}
                    className="btn-teal text-xs w-1/2 py-2.5 bg-purple-600 hover:bg-purple-500"
                  >
                    {approving ? 'Generating Code...' : 'Approve & Issue Code'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL 2: RESET / CHANGE PATIENT PASSWORD */}
      {resetPasswordPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-cyan-500/30 shadow-2xl relative bg-[#0b132b]">
            <button
              onClick={() => setResetPasswordPatient(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading font-bold text-lg text-white mb-1">Admin Password Reset</h3>
            <p className="text-xs text-slate-300 mb-4">
              Change password for <strong className="text-white">{resetPasswordPatient.name}</strong> ({resetPasswordPatient.patient_id}).
            </p>

            {resetMsg && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{resetMsg}</span>
              </div>
            )}

            <form onSubmit={handleResetPatientPassword} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Enter New Password *</label>
                <input
                  type="text"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Enter new password (at least 6 chars)"
                  className="glass-input text-xs"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setResetPasswordPatient(null)}
                  className="btn-secondary text-xs w-1/2 py-2.5"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="btn-teal text-xs w-1/2 py-2.5 bg-cyan-600 hover:bg-cyan-500"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REJECT PATIENT */}
      {rejectModalPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-rose-500/30 shadow-2xl relative bg-[#0b132b]">
            <h3 className="font-heading font-bold text-lg text-white mb-2">Reject Patient Registration</h3>
            <p className="text-xs text-slate-400 mb-4">
              Rejecting registration for <strong className="text-white">{rejectModalPatient.name}</strong> ({rejectModalPatient.patient_id}).
            </p>

            <form onSubmit={handleRejectPatient} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Reason for Rejection *</label>
                <textarea
                  required
                  rows="3"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Identity documents could not be verified."
                  className="glass-input text-xs"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRejectModalPatient(null)}
                  className="btn-secondary text-xs w-1/2 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-secondary text-xs w-1/2 py-2.5 bg-rose-600 text-white hover:bg-rose-500 border-none"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD PARTNER HOSPITAL */}
      {isAddHospitalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-2xl border border-purple-500/30 shadow-2xl relative bg-[#0b132b]">
            <h3 className="font-heading font-bold text-xl text-white mb-4">Add Partner Hospital Facility</h3>

            <form onSubmit={handleAddHospital} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Hospital / Clinic Name *</label>
                <input
                  type="text"
                  required
                  value={hospitalForm.name}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })}
                  placeholder="e.g. Apex Diagnostic Center"
                  className="glass-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Facility Code *</label>
                  <input
                    type="text"
                    required
                    value={hospitalForm.code}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, code: e.target.value })}
                    placeholder="e.g. APEX"
                    className="glass-input text-xs uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">City / Region *</label>
                  <input
                    type="text"
                    required
                    value={hospitalForm.city}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, city: e.target.value })}
                    placeholder="Tirupati, AP"
                    className="glass-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Full Address *</label>
                <input
                  type="text"
                  required
                  value={hospitalForm.address}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, address: e.target.value })}
                  placeholder="Near MR Palli, Renigunta Road, Tirupati, AP 517501"
                  className="glass-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={hospitalForm.contact_email}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, contact_email: e.target.value })}
                    placeholder="info@apex.kenva.local"
                    className="glass-input text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={hospitalForm.contact_phone}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, contact_phone: e.target.value })}
                    placeholder="+91 877 2299004"
                    className="glass-input text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddHospitalOpen(false)}
                  className="btn-secondary text-xs w-1/2 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-teal text-xs w-1/2 py-2.5 bg-purple-600 hover:bg-purple-500"
                >
                  Save Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
