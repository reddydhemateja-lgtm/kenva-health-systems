import React, { useState, useEffect } from 'react';
import { 
  Building2, Calendar, FlaskConical, Plus, CheckCircle2, Clock, 
  AlertCircle, FileText, ArrowRight, User, RefreshCw, Barcode, 
  ChevronRight, ShieldCheck, Download, Truck, Activity, Check, 
  X, Phone, FastForward, Info, Play
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLiveSync } from '../context/useLiveSync';
import SampleTimeline from '../components/SampleTimeline';
import ReportModal from '../components/ReportModal';

export default function HospitalDashboard() {
  const { user, token } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected appointment/sample for live workflow demonstration
  const [activeWorkflowAppointment, setActiveWorkflowAppointment] = useState(null);

  // Modals
  const [isScheduleCollectionOpen, setIsScheduleCollectionOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    scheduled_date: '',
    scheduled_time: '10:00 AM',
    collection_location: '',
    instructions: 'Fasting 8-10 hours recommended before sample collection.'
  });

  const [isAssignCollectorOpen, setIsAssignCollectorOpen] = useState(false);
  const [collectorForm, setCollectorForm] = useState({
    collector_name: 'V. Ramanjaneyulu',
    collector_role: 'Certified Clinical Phlebotomist',
    collector_phone: '+91 94411 22334'
  });

  const [isCollectSampleOpen, setIsCollectSampleOpen] = useState(false);
  const [sampleForm, setSampleForm] = useState({
    sample_type: 'Venous Whole Blood & Serum (EDTA)',
    container_id: '',
    collected_by: 'V. Ramanjaneyulu'
  });

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    nextStage: 6,
    notes: '',
    courier_name: 'Kenva ColdChain Express (Tirupati Hub)',
    tracking_number: 'TRK-KVA-' + Math.floor(100000 + Math.random() * 900000),
    temp_celsius: '3.6',
    receiving_tech: 'P. Vani, Central Intake Specialist',
    analyzer_model: 'Sysmex XN-1000 Automated Hematology System',
    lab_tech: 'Dr. K. Saroja, MD (Senior Pathologist)',
    summary_findings: 'All evaluated biomarkers fall strictly within established clinical reference ranges. Digital signature applied.'
  });

  // Skip Stage Modal
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [skipForm, setSkipForm] = useState({
    stageNumber: 6,
    reason: 'In-house hospital laboratory testing; external logistics transport not required.'
  });

  // Reschedule / Cancel Appointment Modal
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({
    appointment_id: '',
    status: 'RESCHEDULED',
    rescheduled_date: '',
    rescheduled_time: '11:00 AM',
    notes: ''
  });

  // View Report Modal
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchDashboard = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/hospital/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to load hospital dashboard.');
      setData(resData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  // Real-time synchronization: listen for events and fast polling fallback
  useLiveSync(() => {
    fetchDashboard();
  }, { pollIntervalMs: 3000, enabled: !!token });

  // Update appointment status: CONFIRMED or CANCELLED
  const handleUpdateAppointmentStatus = async (appointmentId, status, notes = '') => {
    try {
      const res = await fetch(`/api/hospital/appointments/${appointmentId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, notes })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Update failed.');
      }
      fetchDashboard();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Submit Reschedule or Cancel
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/hospital/appointments/${rescheduleForm.appointment_id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: rescheduleForm.status,
          notes: rescheduleForm.notes,
          rescheduled_date: rescheduleForm.rescheduled_date,
          rescheduled_time: rescheduleForm.rescheduled_time
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Reschedule failed.');
      }
      setIsRescheduleOpen(false);
      fetchDashboard();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Stage 3: Schedule Sample Collection
  const handleScheduleCollection = async (e) => {
    e.preventDefault();
    if (!activeWorkflowAppointment) return;

    try {
      const res = await fetch(`/api/hospital/appointments/${activeWorkflowAppointment.appointment_id}/schedule-collection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(scheduleForm)
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to schedule collection.');

      setIsScheduleCollectionOpen(false);
      fetchDashboard();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Stage 4: Assign Collector
  const handleAssignCollector = async (e) => {
    e.preventDefault();
    if (!activeWorkflowAppointment) return;

    try {
      const res = await fetch(`/api/hospital/appointments/${activeWorkflowAppointment.appointment_id}/assign-collector`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(collectorForm)
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to assign collector.');

      setIsAssignCollectorOpen(false);
      fetchDashboard();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Stage 5: Collect and Register Sample
  const handleRegisterSample = async (e) => {
    e.preventDefault();
    if (!activeWorkflowAppointment) return;

    try {
      const res = await fetch('/api/hospital/samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          appointment_id: activeWorkflowAppointment.appointment_id,
          sample_type: sampleForm.sample_type,
          container_id: sampleForm.container_id || `KEN-BC-${Math.floor(10000 + Math.random() * 90000)}`,
          collected_by: sampleForm.collected_by
        })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to register sample.');

      setIsCollectSampleOpen(false);
      fetchDashboard();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Advance Workflow (Stages 6 to 11)
  const handleAdvanceWorkflow = async (e) => {
    e.preventDefault();
    const sample = activeWorkflowAppointment?.sample;
    if (!sample) return;

    try {
      const res = await fetch(`/api/hospital/samples/${sample.sample_id}/advance-workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(advanceForm)
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Workflow advancement failed.');

      setIsAdvanceModalOpen(false);
      fetchDashboard();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Skip Stage
  const handleSkipStage = async (e) => {
    e.preventDefault();
    const sample = activeWorkflowAppointment?.sample;
    if (!sample) return;

    try {
      const res = await fetch(`/api/hospital/samples/${sample.sample_id}/skip-stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(skipForm)
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to record skipped stage.');

      setIsSkipModalOpen(false);
      fetchDashboard();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
        <span>Connecting to live hospital facility portal...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="glass-panel p-6 rounded-2xl border-rose-500/30 text-center">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h3 className="font-bold text-white text-lg">Hospital Portal Error</h3>
          <p className="text-xs text-slate-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const hospital = data?.hospital || {};
  const stats = data?.stats || {};
  const appointments = data?.appointments || [];

  // Determine current focus item for demonstration control panel
  const focusedAppointment = activeWorkflowAppointment 
    ? appointments.find(a => a.appointment_id === activeWorkflowAppointment.appointment_id) || appointments[0]
    : appointments[0];

  const currentSample = focusedAppointment?.sample;
  const currentStage = currentSample 
    ? currentSample.current_workflow_stage 
    : focusedAppointment?.status === 'CONFIRMED' 
      ? 2 
      : focusedAppointment?.status === 'COLLECTION_SCHEDULED' 
        ? 3 
        : focusedAppointment?.status === 'COLLECTOR_ASSIGNED' 
          ? 4 
          : 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-extrabold text-2xl text-white">{hospital.name}</h2>
              <span className="badge badge-info">{user?.user?.hospitalStaff?.role_title || 'Clinical Operations Staff'}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Authorized Staff: <strong className="text-white">{user?.name}</strong> • Facility Code: <strong className="font-mono text-cyan-300">{hospital.code || 'MCDI'}</strong> • Real-Time Synchronization: <strong className="text-emerald-400">Active</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live Two-Device Mode Active
          </span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400">Total Requests</div>
          <div className="font-heading font-extrabold text-2xl text-white mt-1">{stats.totalAppointments}</div>
        </div>
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-amber-400">Pending Review</div>
          <div className="font-heading font-extrabold text-2xl text-amber-300 mt-1">{stats.pendingAppointments}</div>
        </div>
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-emerald-400">Confirmed</div>
          <div className="font-heading font-extrabold text-2xl text-emerald-300 mt-1">{stats.confirmedAppointments}</div>
        </div>
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-cyan-400">Active Orders</div>
          <div className="font-heading font-extrabold text-2xl text-cyan-300 mt-1">{stats.activeOrders}</div>
        </div>
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-teal-400">Samples Collected</div>
          <div className="font-heading font-extrabold text-2xl text-teal-300 mt-1">{stats.activeSamples}</div>
        </div>
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-teal-300">Reports Published</div>
          <div className="font-heading font-extrabold text-2xl text-teal-200 mt-1">{stats.reportsGenerated}</div>
        </div>
      </div>

      {/* WORKFLOW DEMONSTRATION CONTROL PANEL (Requirement 8) */}
      {focusedAppointment && (
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-r from-slate-900 via-slate-950 to-cyan-950/30 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="badge badge-info font-mono">DEMONSTRATION WORKFLOW CONTROLLER</span>
                <span className="text-xs text-slate-400 font-mono">Stage {currentStage} of 11</span>
              </div>
              <h3 className="font-heading font-bold text-xl text-white mt-1">
                Patient: <span className="text-teal-300">{focusedAppointment.patientName}</span> ({focusedAppointment.patient_id})
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Service: <strong>{focusedAppointment.test_type || focusedAppointment.reason}</strong> • Appointment: <strong className="font-mono text-cyan-300">{focusedAppointment.appointment_id}</strong>
                {currentSample && (
                  <span> • Specimen: <strong className="font-mono text-teal-300">{currentSample.sample_id}</strong></span>
                )}
              </p>
            </div>

            {/* Quick Action Button for Next Stage */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Stage 1 -> 2: Confirm Appointment */}
              {currentStage === 1 && (
                <button
                  onClick={() => handleUpdateAppointmentStatus(focusedAppointment.appointment_id, 'CONFIRMED')}
                  className="btn-teal text-xs py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> 1. Confirm Appointment (Advance to Stage 2)
                </button>
              )}

              {/* Stage 2 -> 3: Schedule Collection */}
              {currentStage === 2 && (
                <button
                  onClick={() => {
                    setActiveWorkflowAppointment(focusedAppointment);
                    setScheduleForm(prev => ({
                      ...prev,
                      scheduled_date: focusedAppointment.preferred_date || new Date().toISOString().split('T')[0],
                      scheduled_time: focusedAppointment.preferred_time || '10:00 AM',
                      collection_location: `${hospital.name} - Specimen Collection Center`
                    }));
                    setIsScheduleCollectionOpen(true);
                  }}
                  className="btn-teal text-xs py-2.5 px-5 bg-cyan-600 hover:bg-cyan-500 flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" /> 2. Schedule Sample Collection (Stage 3)
                </button>
              )}

              {/* Stage 3 -> 4: Assign Collector */}
              {currentStage === 3 && (
                <button
                  onClick={() => {
                    setActiveWorkflowAppointment(focusedAppointment);
                    setIsAssignCollectorOpen(true);
                  }}
                  className="btn-teal text-xs py-2.5 px-5 bg-teal-600 hover:bg-teal-500 flex items-center gap-2"
                >
                  <User className="w-4 h-4" /> 3. Assign Sample Collector (Stage 4)
                </button>
              )}

              {/* Stage 4 -> 5: Collect Sample */}
              {currentStage === 4 && (
                <button
                  onClick={() => {
                    setActiveWorkflowAppointment(focusedAppointment);
                    setSampleForm(prev => ({
                      ...prev,
                      container_id: `KEN-BC-${Math.floor(10000 + Math.random() * 90000)}`,
                      collected_by: focusedAppointment.collector_info?.name || 'V. Ramanjaneyulu'
                    }));
                    setIsCollectSampleOpen(true);
                  }}
                  className="btn-teal text-xs py-2.5 px-5 bg-teal-600 hover:bg-teal-500 flex items-center gap-2"
                >
                  <Barcode className="w-4 h-4" /> 4. Mark Sample Collected (Stage 5)
                </button>
              )}

              {/* Stage 5 through 10 -> Advance to Next Stage */}
              {currentStage >= 5 && currentStage < 11 && (
                <>
                  <button
                    onClick={() => {
                      setActiveWorkflowAppointment(focusedAppointment);
                      setAdvanceForm(prev => ({
                        ...prev,
                        nextStage: currentStage + 1
                      }));
                      setIsAdvanceModalOpen(true);
                    }}
                    className="btn-teal text-xs py-2.5 px-5 bg-cyan-600 hover:bg-cyan-500 flex items-center gap-2 shadow-lg"
                  >
                    <Play className="w-4 h-4" /> Advance to Stage {currentStage + 1}
                  </button>

                  <button
                    onClick={() => {
                      setActiveWorkflowAppointment(focusedAppointment);
                      setSkipForm(prev => ({
                        ...prev,
                        stageNumber: currentStage + 1
                      }));
                      setIsSkipModalOpen(true);
                    }}
                    className="btn-secondary text-xs py-2.5 px-3 flex items-center gap-1.5 text-amber-400"
                  >
                    <FastForward className="w-3.5 h-3.5" /> Skip Stage
                  </button>
                </>
              )}

              {/* Stage 11: View Published Report */}
              {currentStage === 11 && focusedAppointment.order?.report && (
                <button
                  onClick={() => setSelectedReport(focusedAppointment.order.report)}
                  className="btn-teal text-xs py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" /> View Published Patient Report
                </button>
              )}
            </div>
          </div>

          {/* Timeline visualization for this focused appointment */}
          <SampleTimeline 
            sample={focusedAppointment.sample} 
            timeline={focusedAppointment.timeline} 
            onDownloadReport={() => {
              if (focusedAppointment.order?.report) setSelectedReport(focusedAppointment.order.report);
            }}
          />
        </div>
      )}

      {/* APPOINTMENT QUEUE TABLE */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-xl text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" /> Incoming Appointment Requests & Active Workflows
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Click any patient to focus and control their workflow stages in real time.
            </p>
          </div>
          <span className="text-xs text-slate-400">Facility Isolation Enforced</span>
        </div>

        {appointments.length === 0 ? (
          <p className="text-xs text-slate-400">No appointments assigned to this facility.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-300 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Ref ID</th>
                  <th className="p-3">Patient Details</th>
                  <th className="p-3">Service / Reason</th>
                  <th className="p-3">Slot</th>
                  <th className="p-3">Status / Stage</th>
                  <th className="p-3 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {appointments.map(apt => {
                  const isCurrent = focusedAppointment?.appointment_id === apt.appointment_id;
                  return (
                    <tr 
                      key={apt.appointment_id} 
                      onClick={() => setActiveWorkflowAppointment(apt)}
                      className={`hover:bg-slate-900/50 cursor-pointer transition-colors ${
                        isCurrent ? 'bg-cyan-950/20 border-l-2 border-cyan-400' : ''
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-cyan-400">{apt.appointment_id}</td>
                      <td className="p-3">
                        <div className="font-semibold text-white">{apt.patientName}</div>
                        <div className="font-mono text-[10px] text-teal-400">{apt.patient_id} • {apt.patientPhone || apt.patientCity}</div>
                      </td>
                      <td className="p-3 text-slate-300 max-w-xs">{apt.test_type || apt.reason}</td>
                      <td className="p-3 text-slate-300 font-medium whitespace-nowrap">
                        {apt.preferred_date} ({apt.preferred_time})
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`badge ${
                          apt.status === 'CONFIRMED' || apt.status === 'COMPLETED' ? 'badge-approved' : apt.status === 'REJECTED' || apt.status === 'CANCELLED' ? 'badge-rejected' : 'badge-pending'
                        }`}>
                          {apt.sample ? `Stage ${apt.sample.current_workflow_stage}: ${apt.sample.status_label}` : apt.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        {apt.status === 'PENDING_CONFIRMATION' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateAppointmentStatus(apt.appointment_id, 'CONFIRMED');
                              }}
                              className="btn-teal text-[11px] py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRescheduleForm({
                                  appointment_id: apt.appointment_id,
                                  status: 'RESCHEDULED',
                                  rescheduled_date: apt.preferred_date,
                                  rescheduled_time: apt.preferred_time,
                                  notes: ''
                                });
                                setIsRescheduleOpen(true);
                              }}
                              className="btn-secondary text-[11px] py-1 px-2"
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateAppointmentStatus(apt.appointment_id, 'CANCELLED', 'Cancelled by hospital facility');
                              }}
                              className="btn-secondary text-[11px] py-1 px-2 text-rose-400"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveWorkflowAppointment(apt);
                          }}
                          className="btn-secondary text-[11px] py-1 px-2.5 text-cyan-300"
                        >
                          Focus Workflow
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Stage 3 - Schedule Sample Collection */}
      {isScheduleCollectionOpen && activeWorkflowAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-2xl border border-cyan-500/30 shadow-2xl relative">
            <h3 className="font-heading font-bold text-xl text-white mb-2">
              Stage 3: Schedule Sample Collection
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Appointment: <strong className="text-cyan-300">{activeWorkflowAppointment.appointment_id}</strong> • Patient: <strong className="text-white">{activeWorkflowAppointment.patientName}</strong>
            </p>

            <form onSubmit={handleScheduleCollection} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Collection Date *</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.scheduled_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_date: e.target.value })}
                    className="glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Collection Time *</label>
                  <input
                    type="text"
                    required
                    value={scheduleForm.scheduled_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_time: e.target.value })}
                    className="glass-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Collection Location *</label>
                <input
                  type="text"
                  required
                  value={scheduleForm.collection_location}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, collection_location: e.target.value })}
                  placeholder="e.g. Kenva Clinical Collection Station or Home Collection"
                  className="glass-input text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Preparation Instructions for Patient</label>
                <input
                  type="text"
                  value={scheduleForm.instructions}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, instructions: e.target.value })}
                  className="glass-input text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleCollectionOpen(false)}
                  className="btn-secondary text-xs w-1/2 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-teal text-xs w-1/2 py-2.5 bg-cyan-600 hover:bg-cyan-500"
                >
                  Confirm & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Stage 4 - Assign Collector */}
      {isAssignCollectorOpen && activeWorkflowAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-2xl border border-teal-500/30 shadow-2xl relative">
            <h3 className="font-heading font-bold text-xl text-white mb-2">
              Stage 4: Assign Sample Collector
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Assigned collector credentials will be made securely visible in the Patient Portal in real time.
            </p>

            <form onSubmit={handleAssignCollector} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Collector Full Name *</label>
                <input
                  type="text"
                  required
                  value={collectorForm.collector_name}
                  onChange={(e) => setCollectorForm({ ...collectorForm, collector_name: e.target.value })}
                  placeholder="e.g. V. Ramanjaneyulu"
                  className="glass-input text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Role / Designation *</label>
                <input
                  type="text"
                  required
                  value={collectorForm.collector_role}
                  onChange={(e) => setCollectorForm({ ...collectorForm, collector_role: e.target.value })}
                  placeholder="e.g. Certified Phlebotomist"
                  className="glass-input text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Assigned Contact Phone *</label>
                <input
                  type="text"
                  required
                  value={collectorForm.collector_phone}
                  onChange={(e) => setCollectorForm({ ...collectorForm, collector_phone: e.target.value })}
                  placeholder="e.g. +91 94411 22334"
                  className="glass-input text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignCollectorOpen(false)}
                  className="btn-secondary text-xs w-1/2 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-teal text-xs w-1/2 py-2.5 bg-teal-600 hover:bg-teal-500"
                >
                  Assign & Transmit to Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Stage 5 - Collect Sample & Barcode Specimen */}
      {isCollectSampleOpen && activeWorkflowAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-2xl border border-teal-500/30 shadow-2xl relative">
            <h3 className="font-heading font-bold text-xl text-white mb-2">
              Stage 5: Sample Collected & Registered
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Registers unique Sample ID and Barcode into central database.
            </p>

            <form onSubmit={handleRegisterSample} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Specimen Sample Type *</label>
                <input
                  type="text"
                  required
                  value={sampleForm.sample_type}
                  onChange={(e) => setSampleForm({ ...sampleForm, sample_type: e.target.value })}
                  placeholder="e.g. Venous Whole Blood & Serum"
                  className="glass-input text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Container Barcode ID *</label>
                <input
                  type="text"
                  required
                  value={sampleForm.container_id}
                  onChange={(e) => setSampleForm({ ...sampleForm, container_id: e.target.value })}
                  placeholder="e.g. KEN-BC-99212"
                  className="glass-input text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Phlebotomist / Collector</label>
                <input
                  type="text"
                  value={sampleForm.collected_by}
                  onChange={(e) => setSampleForm({ ...sampleForm, collected_by: e.target.value })}
                  className="glass-input text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCollectSampleOpen(false)}
                  className="btn-secondary text-xs w-1/2 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-teal text-xs w-1/2 py-2.5 bg-teal-600 hover:bg-teal-500"
                >
                  Register Specimen & Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Advance Workflow Stages 6 through 11 */}
      {isAdvanceModalOpen && activeWorkflowAppointment?.sample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-2xl border border-cyan-500/30 shadow-2xl relative">
            <h3 className="font-heading font-bold text-xl text-white mb-1">
              Advance Sample Workflow
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Specimen ID: <strong className="font-mono text-teal-300">{activeWorkflowAppointment.sample.sample_id}</strong> • Target: <strong>Stage {advanceForm.nextStage} of 11</strong>
            </p>

            <form onSubmit={handleAdvanceWorkflow} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Select Next Workflow Stage *</label>
                <select
                  value={advanceForm.nextStage}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, nextStage: parseInt(e.target.value, 10) })}
                  className="glass-input text-xs bg-slate-900 text-slate-200"
                >
                  <option value={6} className="bg-slate-900">Stage 6: Logistics Pickup for Transportation</option>
                  <option value={7} className="bg-slate-900">Stage 7: In Transit (Temperature Telemetry)</option>
                  <option value={8} className="bg-slate-900">Stage 8: Laboratory Received (Central Intake)</option>
                  <option value={9} className="bg-slate-900">Stage 9: Testing in Progress (Diagnostic Assay)</option>
                  <option value={10} className="bg-slate-900">Stage 10: Report Ready (Pathologist Verified)</option>
                  <option value={11} className="bg-slate-900">Stage 11: Report Available to Patient (Signed PDF)</option>
                </select>
              </div>

              {advanceForm.nextStage === 6 && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Courier Service</label>
                    <input
                      type="text"
                      value={advanceForm.courier_name}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, courier_name: e.target.value })}
                      className="glass-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Tracking Number</label>
                    <input
                      type="text"
                      value={advanceForm.tracking_number}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, tracking_number: e.target.value })}
                      className="glass-input text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {advanceForm.nextStage === 7 && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Active Cold-Chain Temperature (°C)</label>
                  <input
                    type="text"
                    value={advanceForm.temp_celsius}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, temp_celsius: e.target.value })}
                    placeholder="e.g. 3.6"
                    className="glass-input text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Target range: 2.0°C to 6.0°C</span>
                </div>
              )}

              {advanceForm.nextStage === 8 && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Receiving Intake Laboratory Specialist</label>
                  <input
                    type="text"
                    value={advanceForm.receiving_tech}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, receiving_tech: e.target.value })}
                    className="glass-input text-xs"
                  />
                </div>
              )}

              {advanceForm.nextStage === 9 && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Laboratory Analyzer Model</label>
                  <input
                    type="text"
                    value={advanceForm.analyzer_model}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, analyzer_model: e.target.value })}
                    className="glass-input text-xs"
                  />
                </div>
              )}

              {(advanceForm.nextStage === 10 || advanceForm.nextStage === 11) && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Pathologist Clinical Summary Findings</label>
                  <textarea
                    rows="2"
                    value={advanceForm.summary_findings}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, summary_findings: e.target.value })}
                    className="glass-input text-xs"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Audit Notes / Comments</label>
                <input
                  type="text"
                  value={advanceForm.notes}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                  placeholder="Optional audit log notes"
                  className="glass-input text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="btn-secondary text-xs w-1/2 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-teal text-xs w-1/2 py-2.5 bg-cyan-600 hover:bg-cyan-500"
                >
                  Confirm & Advance Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Skip Stage with Reason */}
      {isSkipModalOpen && activeWorkflowAppointment?.sample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-2xl border border-amber-500/40 shadow-2xl relative">
            <h3 className="font-heading font-bold text-xl text-white mb-1">
              Skip Workflow Stage with Recorded Reason
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Requirement 5: Show only stages that apply. Staff may record a clinical reason to skip non-applicable stages.
            </p>

            <form onSubmit={handleSkipStage} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Stage to Skip *</label>
                <select
                  value={skipForm.stageNumber}
                  onChange={(e) => setSkipForm({ ...skipForm, stageNumber: parseInt(e.target.value, 10) })}
                  className="glass-input text-xs bg-slate-900 text-slate-200"
                >
                  <option value={6} className="bg-slate-900">Stage 6: Logistics Pickup for Transportation</option>
                  <option value={7} className="bg-slate-900">Stage 7: In Transit (Temperature Telemetry)</option>
                  <option value={8} className="bg-slate-900">Stage 8: Laboratory Received</option>
                  <option value={9} className="bg-slate-900">Stage 9: Testing in Progress</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Clinical / Operational Justification *</label>
                <textarea
                  rows="3"
                  required
                  value={skipForm.reason}
                  onChange={(e) => setSkipForm({ ...skipForm, reason: e.target.value })}
                  placeholder="Explain why this stage is not applicable for this diagnostic workflow"
                  className="glass-input text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSkipModalOpen(false)}
                  className="btn-secondary text-xs w-1/2 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-teal text-xs w-1/2 py-2.5 bg-amber-600 hover:bg-amber-500 text-white"
                >
                  Record Skipped Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Reschedule Appointment */}
      {isRescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-2xl border border-cyan-500/30 shadow-2xl relative">
            <h3 className="font-heading font-bold text-xl text-white mb-2">Reschedule Appointment</h3>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">New Date *</label>
                  <input
                    type="date"
                    required
                    value={rescheduleForm.rescheduled_date}
                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, rescheduled_date: e.target.value })}
                    className="glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">New Time Slot *</label>
                  <select
                    value={rescheduleForm.rescheduled_time}
                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, rescheduled_time: e.target.value })}
                    className="glass-input text-xs bg-slate-900 text-slate-200"
                  >
                    <option value="08:30 AM" className="bg-slate-900">08:30 AM</option>
                    <option value="09:30 AM" className="bg-slate-900">09:30 AM</option>
                    <option value="11:00 AM" className="bg-slate-900">11:00 AM</option>
                    <option value="02:30 PM" className="bg-slate-900">02:30 PM</option>
                    <option value="04:30 PM" className="bg-slate-900">04:30 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Reason / Notes for Patient</label>
                <input
                  type="text"
                  value={rescheduleForm.notes}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, notes: e.target.value })}
                  placeholder="e.g. Laboratory analyzer calibration rescheduled to slot"
                  className="glass-input text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRescheduleOpen(false)}
                  className="btn-secondary text-xs w-1/2 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-teal text-xs w-1/2 py-2.5 bg-cyan-600 hover:bg-cyan-500"
                >
                  Update Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Report Preview Modal */}
      <ReportModal
        report={selectedReport}
        patient={{ name: focusedAppointment?.patientName || 'Patient', dob: focusedAppointment?.patientDob, city: focusedAppointment?.patientCity }}
        hospital={hospital}
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
      />

    </div>
  );
}
