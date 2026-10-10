import React, { useState, useEffect } from 'react';
import { 
  Building2, Calendar, FlaskConical, Plus, CheckCircle2, Clock, 
  AlertCircle, FileText, ArrowRight, User, RefreshCw, Barcode, ChevronRight, ShieldCheck, Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SampleTimeline from '../components/SampleTimeline';
import ReportModal from '../components/ReportModal';

export default function HospitalDashboard() {
  const { user, token } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create Test Order Modal
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({
    patient_id: 'KEN-P-1001',
    appointment_id: '',
    test_type: 'Comprehensive Metabolic & Diabetes Panel',
    ordering_physician: 'Dr. Nanireddy Prasad, MD',
    urgency: 'ROUTINE',
    notes: ''
  });

  // Register Sample Modal
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [selectedOrderForSample, setSelectedOrderForSample] = useState(null);
  const [sampleForm, setSampleForm] = useState({
    sample_type: 'Venous Whole Blood & Serum',
    container_id: 'CONT-RED-9910',
    collected_by: 'Nani Kumar'
  });

  // Advance Workflow Modal
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedSampleForWorkflow, setSelectedSampleForWorkflow] = useState(null);
  const [advanceForm, setAdvanceForm] = useState({
    nextStage: 5,
    notes: '',
    courier_name: 'Kenva ColdChain Express (Tirupati Hub)',
    tracking_number: 'TRACK-KVA-990112',
    temp_celsius: '3.8',
    lab_tech: 'Dr. K. Saroja, MD',
    summary_findings: 'All tested parameters satisfy quality calibration standards. No clinical anomalies detected.'
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

  // Appointment status update
  const handleUpdateAppointmentStatus = async (appointmentId, status) => {
    try {
      const res = await fetch(`/api/hospital/appointments/${appointmentId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
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

  // Submit new Test Order
  const handleCreateTestOrder = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/hospital/test-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(orderForm)
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to create order.');

      setIsOrderModalOpen(false);
      fetchDashboard();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Register Sample
  const handleRegisterSample = async (e) => {
    e.preventDefault();
    if (!selectedOrderForSample) return;

    try {
      const res = await fetch('/api/hospital/samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: selectedOrderForSample.order_id,
          ...sampleForm
        })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to register sample.');

      setIsSampleModalOpen(false);
      setSelectedOrderForSample(null);
      fetchDashboard();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Advance Sample Workflow (Stage 5 to 10)
  const handleAdvanceWorkflow = async (e) => {
    e.preventDefault();
    if (!selectedSampleForWorkflow) return;

    try {
      const res = await fetch(`/api/hospital/samples/${selectedSampleForWorkflow.sample_id}/advance-workflow`, {
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
      setSelectedSampleForWorkflow(null);
      fetchDashboard();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
        <span>Loading hospital staff portal...</span>
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
  const testOrders = data?.testOrders || [];
  const samples = data?.samples || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-extrabold text-2xl text-white">{hospital.name}</h2>
              <span className="badge badge-info">{user?.user?.hospitalStaff?.role_title || 'Clinical Staff'}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Staff: <strong className="text-white">{user?.name}</strong> • Facility Code: <strong className="font-mono text-cyan-300">{hospital.code || 'MCDI'}</strong> • Location: <strong className="text-slate-200">{hospital.city || 'Tirupati, AP'}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOrderModalOpen(true)}
          className="btn-teal text-xs py-3 px-6 shadow-xl"
        >
          <Plus className="w-4 h-4" /> Issue New Test Order
        </button>
      </div>

      {/* Hospital KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400">Total Appointments</div>
          <div className="font-heading font-extrabold text-2xl text-white mt-1">{stats.totalAppointments}</div>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-slate-800">
          <div className="text-xs text-amber-400">Pending Confirmation</div>
          <div className="font-heading font-extrabold text-2xl text-amber-300 mt-1">{stats.pendingAppointments}</div>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-slate-800">
          <div className="text-xs text-emerald-400">Confirmed</div>
          <div className="font-heading font-extrabold text-2xl text-emerald-300 mt-1">{stats.confirmedAppointments}</div>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-slate-800">
          <div className="text-xs text-cyan-400">Active Test Orders</div>
          <div className="font-heading font-extrabold text-2xl text-cyan-300 mt-1">{stats.activeOrders}</div>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-slate-800">
          <div className="text-xs text-teal-400">Registered Samples</div>
          <div className="font-heading font-extrabold text-2xl text-teal-300 mt-1">{stats.activeSamples}</div>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-slate-800">
          <div className="text-xs text-purple-400">Reports Generated</div>
          <div className="font-heading font-extrabold text-2xl text-purple-300 mt-1">{stats.reportsGenerated}</div>
        </div>
      </div>

      {/* Section 1: Assigned Patient Appointments Queue */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-xl text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" /> Assigned Patient Appointments
          </h3>
          <span className="text-xs text-slate-400">Facility Isolation Enforced</span>
        </div>

        {appointments.length === 0 ? (
          <p className="text-xs text-slate-400">No appointments assigned to this facility.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-300 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Appointment ID</th>
                  <th className="p-3">Patient Name & ID</th>
                  <th className="p-3">Preferred Slot</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {appointments.map(apt => (
                  <tr key={apt.appointment_id} className="hover:bg-slate-900/40">
                    <td className="p-3 font-mono font-bold text-cyan-400">{apt.appointment_id}</td>
                    <td className="p-3">
                      <div className="font-semibold text-white">{apt.patientName}</div>
                      <div className="font-mono text-[10px] text-teal-400">{apt.patient_id}</div>
                    </td>
                    <td className="p-3 text-slate-300 font-medium">
                      {apt.preferred_date} ({apt.preferred_time})
                    </td>
                    <td className="p-3 text-slate-300 max-w-xs">{apt.reason}</td>
                    <td className="p-3">
                      <span className={`badge ${
                        apt.status === 'CONFIRMED' ? 'badge-approved' : apt.status === 'REJECTED' ? 'badge-rejected' : 'badge-pending'
                      }`}>
                        {apt.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {apt.status === 'PENDING_CONFIRMATION' && (
                        <>
                          <button
                            onClick={() => handleUpdateAppointmentStatus(apt.appointment_id, 'CONFIRMED')}
                            className="btn-teal text-[11px] py-1 px-2.5"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => handleUpdateAppointmentStatus(apt.appointment_id, 'REJECTED')}
                            className="btn-secondary text-[11px] py-1 px-2.5 text-rose-400"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {apt.status === 'CONFIRMED' && (
                        <button
                          onClick={() => {
                            setOrderForm(prev => ({
                              ...prev,
                              patient_id: apt.patient_id,
                              appointment_id: apt.appointment_id
                            }));
                            setIsOrderModalOpen(true);
                          }}
                          className="btn-teal text-[11px] py-1 px-2.5 bg-cyan-600"
                        >
                          + Issue Order
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Active Test Orders & Sample Registration */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-xl text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-teal-400" /> Active Diagnostic Orders & Sample Registration
          </h3>
          <button
            onClick={() => setIsOrderModalOpen(true)}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <Plus className="w-4 h-4" /> Issue Test Order
          </button>
        </div>

        {testOrders.length === 0 ? (
          <p className="text-xs text-slate-400">No test orders registered.</p>
        ) : (
          <div className="space-y-6">
            {testOrders.map(order => (
              <div key={order.order_id} className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-400">{order.order_id}</span>
                      <span className="badge badge-info">{order.status}</span>
                      <span className="text-xs text-slate-400">Patient: <strong className="text-white">{order.patientName}</strong> ({order.patient_id})</span>
                    </div>
                    <h4 className="font-heading font-bold text-lg text-white mt-1">{order.test_type}</h4>
                    <p className="text-xs text-slate-400">Physician: {order.ordering_physician} • Urgency: <span className="font-bold text-amber-400">{order.urgency}</span></p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!order.sample && (
                      <button
                        onClick={() => {
                          setSelectedOrderForSample(order);
                          setIsSampleModalOpen(true);
                        }}
                        className="btn-teal text-xs py-2 px-4 bg-teal-600"
                      >
                        <Barcode className="w-4 h-4" /> Register Specimen Barcode
                      </button>
                    )}

                    {order.sample && order.sample.current_workflow_stage < 10 && (
                      <button
                        onClick={() => {
                          setSelectedSampleForWorkflow(order.sample);
                          setAdvanceForm(prev => ({
                            ...prev,
                            nextStage: Math.min(order.sample.current_workflow_stage + 1, 10)
                          }));
                          setIsAdvanceModalOpen(true);
                        }}
                        className="btn-teal text-xs py-2 px-4 bg-cyan-600"
                      >
                        Advance Workflow (Stage {order.sample.current_workflow_stage + 1}) <ArrowRight className="w-4 h-4" />
                      </button>
                    )}

                    {order.report && (
                      <button
                        onClick={() => setSelectedReport(order.report)}
                        className="btn-secondary text-xs py-2 px-4"
                      >
                        <FileText className="w-4 h-4 text-teal-400" /> View Signed Report
                      </button>
                    )}
                  </div>
                </div>

                {/* Show Sample Timeline if registered */}
                {order.sample && (
                  <SampleTimeline sample={order.sample} timeline={order.timeline} />
                )}

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal 1: Issue Test Order */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-2xl border border-teal-500/30 shadow-2xl relative">
            <h3 className="font-heading font-bold text-xl text-white mb-4">Issue Diagnostic Test Order</h3>
            
            <form onSubmit={handleCreateTestOrder} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Patient ID *</label>
                <input
                  type="text"
                  required
                  value={orderForm.patient_id}
                  onChange={(e) => setOrderForm({ ...orderForm, patient_id: e.target.value })}
                  placeholder="e.g. KEN-P-1001"
                  className="glass-input text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Test Type / Panel *</label>
                <input
                  type="text"
                  required
                  value={orderForm.test_type}
                  onChange={(e) => setOrderForm({ ...orderForm, test_type: e.target.value })}
                  placeholder="e.g. Comprehensive Metabolic & Diabetes Panel"
                  className="glass-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Ordering Physician *</label>
                  <input
                    type="text"
                    required
                    value={orderForm.ordering_physician}
                    onChange={(e) => setOrderForm({ ...orderForm, ordering_physician: e.target.value })}
                    placeholder="Dr. Nanireddy Prasad, MD"
                    className="glass-input text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Urgency Level</label>
                  <select
                    value={orderForm.urgency}
                    onChange={(e) => setOrderForm({ ...orderForm, urgency: e.target.value })}
                    className="glass-input text-xs bg-slate-900 text-slate-200"
                  >
                    <option value="ROUTINE" className="bg-slate-900">ROUTINE</option>
                    <option value="URGENT" className="bg-slate-900">URGENT</option>
                    <option value="STAT" className="bg-slate-900">STAT / EMERGENCY</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="btn-secondary text-xs w-1/2 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-teal text-xs w-1/2 py-2.5"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Register Sample */}
      {isSampleModalOpen && selectedOrderForSample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-2xl border border-teal-500/30 shadow-2xl relative">
            <h3 className="font-heading font-bold text-xl text-white mb-2">Register Specimen & Barcode</h3>
            <p className="text-xs text-slate-400 mb-4">
              Order: <span className="font-mono text-cyan-400">{selectedOrderForSample.order_id}</span> ({selectedOrderForSample.test_type})
            </p>

            <form onSubmit={handleRegisterSample} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Sample Specimen Type *</label>
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
                  placeholder="e.g. CONT-RED-9910"
                  className="glass-input text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Phlebotomist / Clinical Staff</label>
                <input
                  type="text"
                  value={sampleForm.collected_by}
                  onChange={(e) => setSampleForm({ ...sampleForm, collected_by: e.target.value })}
                  placeholder="Nani Kumar"
                  className="glass-input text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSampleModalOpen(false)}
                  className="btn-secondary text-xs w-1/2 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-teal text-xs w-1/2 py-2.5"
                >
                  Register & Assign Barcode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Advance Workflow Stage (5 through 10) */}
      {isAdvanceModalOpen && selectedSampleForWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-2xl border border-cyan-500/30 shadow-2xl relative">
            <h3 className="font-heading font-bold text-xl text-white mb-1">
              Advance Sample Workflow Stage
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Sample ID: <span className="font-mono text-teal-400">{selectedSampleForWorkflow.sample_id}</span> • Current Stage: <strong>{selectedSampleForWorkflow.current_workflow_stage} of 10</strong>
            </p>

            <form onSubmit={handleAdvanceWorkflow} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Target Workflow Stage *</label>
                <select
                  value={advanceForm.nextStage}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, nextStage: parseInt(e.target.value, 10) })}
                  className="glass-input text-xs bg-slate-900 text-slate-200"
                >
                  <option value={5} className="bg-slate-900">Stage 5: Logistics Pickup (ColdChain Courier)</option>
                  <option value={6} className="bg-slate-900">Stage 6: In Transit (Temperature Telemetry)</option>
                  <option value={7} className="bg-slate-900">Stage 7: Laboratory Received (Central Intake)</option>
                  <option value={8} className="bg-slate-900">Stage 8: Testing in Progress (Assay Assay)</option>
                  <option value={9} className="bg-slate-900">Stage 9: Testing Completed (Pathologist Review)</option>
                  <option value={10} className="bg-slate-900">Stage 10: Report Generated & Published to Patient</option>
                </select>
              </div>

              {advanceForm.nextStage >= 5 && advanceForm.nextStage <= 6 && (
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
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Temp (°C)</label>
                    <input
                      type="text"
                      value={advanceForm.temp_celsius}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, temp_celsius: e.target.value })}
                      className="glass-input text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {advanceForm.nextStage >= 7 && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Lead Pathologist / Specialist</label>
                  <input
                    type="text"
                    value={advanceForm.lab_tech}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, lab_tech: e.target.value })}
                    placeholder="Dr. K. Saroja, MD"
                    className="glass-input text-xs"
                  />
                </div>
              )}

              {advanceForm.nextStage === 10 && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Summary Findings for Final Report</label>
                  <textarea
                    rows="2"
                    value={advanceForm.summary_findings}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, summary_findings: e.target.value })}
                    className="glass-input text-xs"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Stage Audit Notes</label>
                <input
                  type="text"
                  value={advanceForm.notes}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                  placeholder="Additional verification notes for audit log"
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
                  className="btn-teal text-xs w-1/2 py-2.5 bg-cyan-600"
                >
                  Advance Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Report Preview Modal */}
      <ReportModal
        report={selectedReport}
        patient={{ name: 'Nani Reddem', dob: '1990-08-15', city: 'Tirupati' }}
        hospital={hospital}
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
      />

    </div>
  );
}
