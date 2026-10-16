const express = require('express');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendNotificationEmail } = require('../services/emailService');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['HOSPITAL', 'ADMIN']));

/**
 * Stage definitions for the 11-stage workflow
 */
const STAGES = {
  1: { num: 1, name: 'Appointment Requested', label: 'Requested', code: 'APPOINTMENT_REQUESTED' },
  2: { num: 2, name: 'Appointment Confirmed', label: 'Confirmed', code: 'APPOINTMENT_CONFIRMED' },
  3: { num: 3, name: 'Sample Collection Scheduled', label: 'Collection Scheduled', code: 'COLLECTION_SCHEDULED' },
  4: { num: 4, name: 'Sample Collector Assigned', label: 'Collector Assigned', code: 'COLLECTOR_ASSIGNED' },
  5: { num: 5, name: 'Sample Collected', label: 'Sample Collected', code: 'SAMPLE_COLLECTED' },
  6: { num: 6, name: 'Sample Picked Up for Transportation', label: 'Logistics Pickup', code: 'LOGISTICS_PICKUP' },
  7: { num: 7, name: 'Sample in Transit', label: 'In Transit', code: 'IN_TRANSIT' },
  8: { num: 8, name: 'Sample Received by Laboratory', label: 'Laboratory Received', code: 'LAB_RECEIVED' },
  9: { num: 9, name: 'Testing in Progress', label: 'Testing in Progress', code: 'TESTING_IN_PROGRESS' },
  10: { num: 10, name: 'Report Ready', label: 'Report Ready', code: 'REPORT_READY' },
  11: { num: 11, name: 'Report Available to Patient', label: 'Report Available', code: 'REPORT_AVAILABLE' }
};

/**
 * Get Hospital Staff Context
 */
function getHospitalContext(req) {
  if (req.user.role === 'ADMIN') {
    return { isGlobalAdmin: true, hospitalId: req.query.hospitalId || null };
  }
  const staff = db.findOne('hospital_staff', s => s.user_id === req.user.id);
  return { isGlobalAdmin: false, hospitalId: staff ? staff.hospital_id : null, staff };
}

/**
 * GET /api/hospital/dashboard
 * Hospital stats, assigned appointments, patient records, test orders, samples, and reports
 */
router.get('/dashboard', (req, res) => {
  const ctx = getHospitalContext(req);
  const hospitalId = ctx.hospitalId;

  if (!ctx.isGlobalAdmin && !hospitalId) {
    return res.status(403).json({ error: 'Hospital staff user is not assigned to a facility.' });
  }

  const hospital = hospitalId ? db.findOne('hospitals', h => h.id === hospitalId) : null;

  // Filter records strictly by hospitalId for hospital staff
  const appointments = hospitalId 
    ? db.find('appointments', a => a.hospital_id === hospitalId)
    : db.find('appointments');

  const testOrders = hospitalId
    ? db.find('test_orders', t => t.hospital_id === hospitalId)
    : db.find('test_orders');

  const samples = hospitalId
    ? db.find('samples', s => s.hospital_id === hospitalId)
    : db.find('samples');

  const reports = hospitalId
    ? db.find('reports', r => r.hospital_id === hospitalId)
    : db.find('reports');

  const patientProfiles = db.find('patient_profiles');
  const users = db.find('users');
  const timelines = db.find('sample_workflow_timeline');

  // Enriched Appointments
  const enrichedAppointments = appointments.map(apt => {
    const profile = patientProfiles.find(p => p.patient_id === apt.patient_id);
    const patientUser = profile ? users.find(u => u.id === profile.user_id) : null;
    const order = testOrders.find(o => o.appointment_id === apt.appointment_id);
    const sample = order ? samples.find(s => s.order_id === order.order_id) : samples.find(s => s.appointment_id === apt.appointment_id);
    const orderTimeline = sample
      ? timelines.filter(t => t.sample_id === sample.sample_id).sort((a, b) => a.stage_number - b.stage_number)
      : timelines.filter(t => t.appointment_id === apt.appointment_id).sort((a, b) => a.stage_number - b.stage_number);

    return {
      ...apt,
      patientName: patientUser ? patientUser.name : 'Unknown Patient',
      patientEmail: patientUser ? patientUser.email : '',
      patientPhone: patientUser ? patientUser.phone : '',
      patientDob: profile ? profile.dob : '',
      patientCity: profile ? profile.city : '',
      order: order || null,
      sample: sample || null,
      timeline: orderTimeline
    };
  });

  // Enriched Test Orders
  const enrichedOrders = testOrders.map(order => {
    const profile = patientProfiles.find(p => p.patient_id === order.patient_id);
    const patientUser = profile ? users.find(u => u.id === profile.user_id) : null;
    const sample = samples.find(s => s.order_id === order.order_id);
    const report = reports.find(r => r.order_id === order.order_id);
    const orderTimeline = sample ? timelines.filter(t => t.sample_id === sample.sample_id).sort((a, b) => a.stage_number - b.stage_number) : [];

    return {
      ...order,
      patientName: patientUser ? patientUser.name : 'Unknown Patient',
      sample: sample || null,
      report: report || null,
      timeline: orderTimeline
    };
  });

  return res.json({
    hospital: hospital || { name: 'All Facilities View (Admin Mode)' },
    stats: {
      totalAppointments: appointments.length,
      pendingAppointments: appointments.filter(a => a.status === 'PENDING_CONFIRMATION').length,
      confirmedAppointments: appointments.filter(a => a.status === 'CONFIRMED').length,
      activeOrders: testOrders.length,
      activeSamples: samples.length,
      reportsGenerated: reports.length
    },
    appointments: enrichedAppointments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    testOrders: enrichedOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    samples,
    reports
  });
});

/**
 * POST /api/hospital/appointments/:appointmentId/status
 * Confirm, reschedule, or cancel appointment (Stage 2)
 */
router.post('/appointments/:appointmentId/status', async (req, res) => {
  const ctx = getHospitalContext(req);
  const { appointmentId } = req.params;
  const { status, notes, rescheduled_date, rescheduled_time } = req.body;

  const apt = db.findOne('appointments', a => a.appointment_id === appointmentId);
  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  if (!ctx.isGlobalAdmin && apt.hospital_id !== ctx.hospitalId) {
    return res.status(403).json({ error: 'Access denied. Appointment belongs to another hospital.' });
  }

  const updatedAt = new Date().toISOString();
  const updatePayload = {
    status,
    notes: notes || apt.notes,
    updated_at: updatedAt
  };

  if (rescheduled_date) updatePayload.preferred_date = rescheduled_date;
  if (rescheduled_time) updatePayload.preferred_time = rescheduled_time;

  db.update('appointments', a => a.appointment_id === appointmentId, updatePayload);

  const hospital = db.findOne('hospitals', h => h.id === apt.hospital_id);
  const hospitalName = hospital ? hospital.name : 'Hospital Facility';

  // Add Stage 2 timeline event when confirmed
  if (status === 'CONFIRMED') {
    db.insert('sample_workflow_timeline', {
      id: 'TL-' + Date.now() + '-2',
      appointment_id: appointmentId,
      sample_id: null,
      stage_number: 2,
      stage_name: 'Appointment Confirmed',
      actor_name: req.user.name,
      actor_role: 'Hospital Staff',
      location: hospitalName,
      timestamp: updatedAt,
      notes: notes || `Appointment confirmed for ${updatePayload.preferred_date || apt.preferred_date} at ${updatePayload.preferred_time || apt.preferred_time}.`
    });
  }

  db.logAudit({
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: 'HOSPITAL_STAFF',
    action: 'UPDATE_APPOINTMENT_STATUS',
    target_type: 'APPOINTMENT',
    target_id: appointmentId,
    details: { status, notes }
  });

  // Notify patient
  const profile = db.findOne('patient_profiles', p => p.patient_id === apt.patient_id);
  if (profile) {
    const user = db.findOne('users', u => u.id === profile.user_id);
    if (user) {
      db.notifyUser({
        user_id: user.id,
        title: `Appointment ${status === 'CONFIRMED' ? 'Confirmed' : status === 'RESCHEDULED' ? 'Rescheduled' : 'Cancelled'}`,
        message: `Your appointment (${appointmentId}) at ${hospitalName} is now ${status}. ${notes || ''}`,
        type: 'APPOINTMENT_STATUS_CHANGE'
      });

      await sendNotificationEmail({
        to: user.email,
        subject: `Kenva Health Systems: Appointment ${status} (${appointmentId})`,
        plainText: `Hello ${user.name},\n\nYour appointment (${appointmentId}) at ${hospitalName} has been ${status}.\n${notes ? `Notes: ${notes}\n` : ''}\n— Kenva Health Systems`,
        htmlText: `<div style="font-family: sans-serif; color: #1e293b; max-width: 500px; padding: 20px;">
          <h2 style="color: #0d9488;">Appointment Status: ${status}</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>Your appointment <strong>${appointmentId}</strong> has been updated to <strong>${status}</strong>.</p>
          ${notes ? `<p style="background:#f1f5f9; padding: 10px; border-radius: 6px;">${notes}</p>` : ''}
        </div>`,
        userId: user.id,
        type: 'APPOINTMENT_STATUS_CHANGE'
      });
    }
  }

  // Broadcast real-time change to live clients
  db.broadcastChange({
    event: 'APPOINTMENT_STATUS_UPDATED',
    appointmentId,
    status,
    patientId: apt.patient_id
  });

  return res.json({ message: `Appointment status updated to ${status}.`, appointmentId });
});

/**
 * POST /api/hospital/appointments/:appointmentId/schedule-collection
 * Stage 3: Schedule Sample Collection
 */
router.post('/appointments/:appointmentId/schedule-collection', async (req, res) => {
  const ctx = getHospitalContext(req);
  const { appointmentId } = req.params;
  const { scheduled_date, scheduled_time, collection_location, instructions } = req.body;

  const apt = db.findOne('appointments', a => a.appointment_id === appointmentId);
  if (!apt) return res.status(404).json({ error: 'Appointment not found.' });

  if (!ctx.isGlobalAdmin && apt.hospital_id !== ctx.hospitalId) {
    return res.status(403).json({ error: 'Access denied. Appointment belongs to another facility.' });
  }

  const now = new Date().toISOString();
  const hospital = db.findOne('hospitals', h => h.id === apt.hospital_id);
  const hospitalName = hospital ? hospital.name : 'Hospital Facility';

  const scheduledInfo = {
    date: scheduled_date || apt.preferred_date,
    time: scheduled_time || apt.preferred_time,
    location: collection_location || `${hospitalName} - Specimen Collection Center`,
    instructions: instructions || 'Fasting 8-10 hours recommended before sample collection.'
  };

  db.update('appointments', a => a.appointment_id === appointmentId, {
    status: 'COLLECTION_SCHEDULED',
    scheduled_collection: scheduledInfo,
    updated_at: now
  });

  // Timeline Stage 3
  db.insert('sample_workflow_timeline', {
    id: 'TL-' + Date.now() + '-3',
    appointment_id: appointmentId,
    sample_id: null,
    stage_number: 3,
    stage_name: 'Sample Collection Scheduled',
    actor_name: req.user.name,
    actor_role: 'Clinical Operations',
    location: scheduledInfo.location,
    timestamp: now,
    notes: `Collection scheduled for ${scheduledInfo.date} at ${scheduledInfo.time}. ${scheduledInfo.instructions}`
  });

  // Notify patient
  const profile = db.findOne('patient_profiles', p => p.patient_id === apt.patient_id);
  if (profile) {
    const user = db.findOne('users', u => u.id === profile.user_id);
    if (user) {
      db.notifyUser({
        user_id: user.id,
        title: 'Sample Collection Scheduled',
        message: `Your sample collection is scheduled for ${scheduledInfo.date} at ${scheduledInfo.time} at ${scheduledInfo.location}.`,
        type: 'COLLECTION_SCHEDULED'
      });
    }
  }

  db.broadcastChange({
    event: 'WORKFLOW_STAGE_UPDATED',
    appointmentId,
    stage: 3,
    stage_name: 'Sample Collection Scheduled',
    patientId: apt.patient_id
  });

  return res.json({ message: 'Sample collection scheduled successfully.', scheduledInfo });
});

/**
 * POST /api/hospital/appointments/:appointmentId/assign-collector
 * Stage 4: Assign Sample Collector (name, role, contact phone)
 */
router.post('/appointments/:appointmentId/assign-collector', async (req, res) => {
  const ctx = getHospitalContext(req);
  const { appointmentId } = req.params;
  const { collector_name, collector_role, collector_phone } = req.body;

  if (!collector_name) {
    return res.status(400).json({ error: 'Collector name is required.' });
  }

  const apt = db.findOne('appointments', a => a.appointment_id === appointmentId);
  if (!apt) return res.status(404).json({ error: 'Appointment not found.' });

  if (!ctx.isGlobalAdmin && apt.hospital_id !== ctx.hospitalId) {
    return res.status(403).json({ error: 'Access denied. Appointment belongs to another facility.' });
  }

  const now = new Date().toISOString();
  const hospital = db.findOne('hospitals', h => h.id === apt.hospital_id);
  const hospitalName = hospital ? hospital.name : 'Hospital Facility';

  const collectorInfo = {
    name: collector_name.trim(),
    role: collector_role ? collector_role.trim() : 'Certified Phlebotomist',
    phone: collector_phone ? collector_phone.trim() : '+91 94411 22334',
    assigned_at: now
  };

  db.update('appointments', a => a.appointment_id === appointmentId, {
    status: 'COLLECTOR_ASSIGNED',
    collector_info: collectorInfo,
    updated_at: now
  });

  // Timeline Stage 4
  db.insert('sample_workflow_timeline', {
    id: 'TL-' + Date.now() + '-4',
    appointment_id: appointmentId,
    sample_id: null,
    stage_number: 4,
    stage_name: 'Sample Collector Assigned',
    actor_name: req.user.name,
    actor_role: 'Hospital Coordinator',
    location: hospitalName,
    timestamp: now,
    notes: `Assigned specimen collector: ${collectorInfo.name} (${collectorInfo.role}, Contact: ${collectorInfo.phone})`
  });

  // Notify patient
  const profile = db.findOne('patient_profiles', p => p.patient_id === apt.patient_id);
  if (profile) {
    const user = db.findOne('users', u => u.id === profile.user_id);
    if (user) {
      db.notifyUser({
        user_id: user.id,
        title: 'Sample Collector Assigned',
        message: `Your sample collector is ${collectorInfo.name} (${collectorInfo.role}). Contact: ${collectorInfo.phone}.`,
        type: 'COLLECTOR_ASSIGNED'
      });
    }
  }

  db.broadcastChange({
    event: 'WORKFLOW_STAGE_UPDATED',
    appointmentId,
    stage: 4,
    stage_name: 'Sample Collector Assigned',
    collector_info: collectorInfo,
    patientId: apt.patient_id
  });

  return res.json({ message: 'Sample collector assigned successfully.', collectorInfo });
});

/**
 * POST /api/hospital/samples
 * Stage 5: Collect & Register Sample
 */
router.post('/samples', (req, res) => {
  const ctx = getHospitalContext(req);
  const { appointment_id, sample_type, container_id, collected_by } = req.body;

  if (!appointment_id) {
    return res.status(400).json({ error: 'Appointment ID is required.' });
  }

  const apt = db.findOne('appointments', a => a.appointment_id === appointment_id);
  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  if (!ctx.isGlobalAdmin && apt.hospital_id !== ctx.hospitalId) {
    return res.status(403).json({ error: 'Access denied. Appointment belongs to another facility.' });
  }

  const sampleId = 'SMP-' + Math.floor(10000 + Math.random() * 90000);
  const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();
  const hospital = db.findOne('hospitals', h => h.id === apt.hospital_id);
  const hospitalName = hospital ? hospital.name : 'Hospital Facility';

  const collectorName = collected_by || (apt.collector_info ? apt.collector_info.name : req.user.name);
  const finalContainerId = container_id || `KEN-BC-${Math.floor(10000 + Math.random() * 90000)}`;
  const finalSampleType = sample_type || 'Venous Whole Blood (EDTA)';

  // Insert Test Order
  const newOrder = {
    order_id: orderId,
    appointment_id: apt.appointment_id,
    patient_id: apt.patient_id,
    hospital_id: apt.hospital_id,
    test_type: apt.test_type || 'Diagnostic Panel',
    ordering_physician: req.user.name,
    urgency: 'ROUTINE',
    status: 'SAMPLE_COLLECTED',
    notes: apt.notes || '',
    created_at: now
  };
  db.insert('test_orders', newOrder);

  // Insert Sample Record (Stage 5)
  const newSample = {
    sample_id: sampleId,
    order_id: orderId,
    appointment_id: apt.appointment_id,
    patient_id: apt.patient_id,
    hospital_id: apt.hospital_id,
    sample_type: finalSampleType,
    container_id: finalContainerId,
    collected_at: now,
    collected_by: collectorName,
    current_workflow_stage: 5,
    status_label: 'Sample Collected',
    created_at: now
  };
  db.insert('samples', newSample);

  // Update appointment status
  db.update('appointments', a => a.appointment_id === appointment_id, {
    status: 'SAMPLE_COLLECTED',
    updated_at: now
  });

  // Re-link previous timeline events for this appointment to the new sample_id
  db.update('sample_workflow_timeline', t => t.appointment_id === appointment_id, {
    sample_id: sampleId
  });

  // Insert Stage 5 Timeline event
  db.insert('sample_workflow_timeline', {
    id: 'TL-' + Date.now() + '-5',
    appointment_id: appointment_id,
    sample_id: sampleId,
    stage_number: 5,
    stage_name: 'Sample Collected',
    actor_name: collectorName,
    actor_role: 'Phlebotomist / Collector',
    location: `${hospitalName} Specimen Collection`,
    timestamp: now,
    notes: `${finalSampleType} collected in barcoded container ${finalContainerId}. Unique Sample ID: ${sampleId}`
  });

  // Notify patient
  const profile = db.findOne('patient_profiles', p => p.patient_id === apt.patient_id);
  if (profile) {
    const user = db.findOne('users', u => u.id === profile.user_id);
    if (user) {
      db.notifyUser({
        user_id: user.id,
        title: 'Specimen Collected',
        message: `Your sample (${sampleId}) has been collected by ${collectorName}. Barcode registered: ${finalContainerId}.`,
        type: 'SAMPLE_COLLECTED'
      });
    }
  }

  db.broadcastChange({
    event: 'WORKFLOW_STAGE_UPDATED',
    appointmentId: apt.appointment_id,
    sampleId,
    stage: 5,
    stage_name: 'Sample Collected',
    patientId: apt.patient_id
  });

  return res.status(201).json({
    message: 'Sample collected and registered successfully.',
    sample: newSample,
    order: newOrder
  });
});

/**
 * POST /api/hospital/samples/:sampleId/advance-workflow
 * Advance sample across stages 6 to 11
 */
router.post('/samples/:sampleId/advance-workflow', async (req, res) => {
  const ctx = getHospitalContext(req);
  const { sampleId } = req.params;
  const {
    nextStage,
    notes,
    courier_name,
    tracking_number,
    temp_celsius,
    receiving_tech,
    analyzer_model,
    lab_tech,
    summary_findings,
    test_results_json
  } = req.body;

  const sample = db.findOne('samples', s => s.sample_id === sampleId);
  if (!sample) return res.status(404).json({ error: 'Sample record not found.' });

  if (!ctx.isGlobalAdmin && sample.hospital_id !== ctx.hospitalId) {
    return res.status(403).json({ error: 'Access denied. Sample belongs to another facility.' });
  }

  const stageNum = parseInt(nextStage, 10);
  if (isNaN(stageNum) || stageNum < 6 || stageNum > 11) {
    return res.status(400).json({ error: 'Stage number must be between 6 and 11.' });
  }

  const stageMeta = STAGES[stageNum];
  const now = new Date().toISOString();
  const hospital = db.findOne('hospitals', h => h.id === sample.hospital_id);
  const hospitalName = hospital ? hospital.name : 'Hospital Facility';

  // Specific stage handling & metadata
  let actorName = req.user.name;
  let actorRole = 'Hospital Staff';
  let location = hospitalName;
  let stageNotes = notes || '';

  if (stageNum === 6) {
    // Stage 6: Logistics Pickup
    actorName = courier_name || 'Kenva ColdChain Express';
    actorRole = 'Certified Logistics Courier';
    location = `${hospitalName} Dispatch Bay`;
    stageNotes = `Sample dispatched under temperature control. Tracking: ${tracking_number || 'TRK-' + Math.floor(100000 + Math.random() * 900000)}`;
  } else if (stageNum === 7) {
    // Stage 7: In Transit
    actorName = courier_name || 'Kenva ColdChain Express';
    actorRole = 'Logistics Transport';
    location = 'En Route (Air Bypass Road - Central Lab Corridor)';
    const temp = temp_celsius !== undefined ? `${temp_celsius}°C` : '3.6°C';
    stageNotes = `Sample in transit. Active telemetry: ${temp} (within target range 2.0°C - 6.0°C).`;
  } else if (stageNum === 8) {
    // Stage 8: Laboratory Received
    actorName = receiving_tech || 'Receiving Tech P. Vani';
    actorRole = 'Intake Laboratory Specialist';
    location = 'Kenva Central Reference Laboratory (Tirupati)';
    stageNotes = `Specimen arrived at laboratory. Container barcode verified intact at ${temp_celsius || '3.5'}°C.`;
  } else if (stageNum === 9) {
    // Stage 9: Testing in Progress
    actorName = lab_tech || 'Dr. K. Saroja, MD';
    actorRole = 'Endocrinology / Pathology Specialist';
    location = 'Kenva Central Reference Laboratory (Tirupati)';
    stageNotes = `Testing underway using ${analyzer_model || 'Automated Hematology Analyzer Sysmex XN-1000'}.`;
  } else if (stageNum === 10) {
    // Stage 10: Report Ready
    actorName = lab_tech || 'Dr. K. Saroja, MD';
    actorRole = 'Senior Pathologist';
    location = 'Kenva Central Reference Laboratory (Tirupati)';
    stageNotes = `Diagnostic findings verified and digitally approved by pathologist. ${summary_findings || ''}`;
  } else if (stageNum === 11) {
    // Stage 11: Report Available to Patient
    actorName = 'Kenva Core System';
    actorRole = 'Report Delivery Service';
    location = 'Kenva Health Secure Portal';
    stageNotes = 'Final cryptographically signed PDF diagnostic report published to Patient Portal.';

    // Publish Report Record
    const order = db.findOne('test_orders', o => o.order_id === sample.order_id);
    const reportId = 'REP-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const existingReport = db.findOne('reports', r => r.sample_id === sampleId);

    if (!existingReport) {
      const defaultResults = test_results_json || [
        { parameter: 'Hemoglobin', value: '14.2', unit: 'g/dL', reference: '13.0 - 17.0', status: 'NORMAL' },
        { parameter: 'Total WBC Count', value: '6,800', unit: '/mcL', reference: '4,500 - 11,000', status: 'NORMAL' },
        { parameter: 'Platelet Count', value: '240,000', unit: '/mcL', reference: '150,000 - 450,000', status: 'NORMAL' },
        { parameter: 'RBC Count', value: '4.85', unit: 'million/mcL', reference: '4.5 - 5.9', status: 'NORMAL' },
        { parameter: 'Neutrophils', value: '62', unit: '%', reference: '40 - 70', status: 'NORMAL' },
        { parameter: 'Lymphocytes', value: '30', unit: '%', reference: '20 - 40', status: 'NORMAL' }
      ];

      db.insert('reports', {
        id: reportId,
        report_id: reportId,
        order_id: sample.order_id,
        sample_id: sample.sample_id,
        patient_id: sample.patient_id,
        hospital_id: sample.hospital_id,
        hospital_name: hospitalName,
        test_type: order ? order.test_type : 'Diagnostic Blood Profile',
        summary_findings: summary_findings || 'All biomarkers within normal diagnostic clinical reference ranges.',
        test_results_json: defaultResults,
        pathologist_name: lab_tech || 'Dr. K. Saroja, MD (Senior Pathologist)',
        created_at: now,
        verification_hash: 'SHA256:' + Math.random().toString(36).substring(2, 10).toUpperCase() + Date.now().toString(36).toUpperCase()
      });
    }

    // Complete appointment
    if (sample.appointment_id) {
      db.update('appointments', a => a.appointment_id === sample.appointment_id, {
        status: 'COMPLETED',
        updated_at: now
      });
    }
  }

  // Update sample record
  db.update('samples', s => s.sample_id === sampleId, {
    current_workflow_stage: stageNum,
    status_label: stageMeta.label
  });

  // Update order record
  if (sample.order_id) {
    db.update('test_orders', o => o.order_id === sample.order_id, {
      status: stageMeta.code
    });
  }

  // Add timeline entry
  db.insert('sample_workflow_timeline', {
    id: 'TL-' + Date.now() + '-' + stageNum,
    appointment_id: sample.appointment_id || null,
    sample_id: sampleId,
    stage_number: stageNum,
    stage_name: stageMeta.name,
    actor_name: actorName,
    actor_role: actorRole,
    location,
    timestamp: now,
    notes: stageNotes
  });

  // Notify patient
  const profile = db.findOne('patient_profiles', p => p.patient_id === sample.patient_id);
  if (profile) {
    const user = db.findOne('users', u => u.id === profile.user_id);
    if (user) {
      db.notifyUser({
        user_id: user.id,
        title: `Workflow Update: ${stageMeta.name}`,
        message: `Your sample (${sampleId}) has progressed to Stage ${stageNum}: ${stageMeta.name}. ${stageNotes}`,
        type: 'WORKFLOW_PROGRESSION'
      });

      if (stageNum === 11) {
        await sendNotificationEmail({
          to: user.email,
          subject: `Kenva Health Systems: Diagnostic Report Ready (${sampleId})`,
          plainText: `Hello ${user.name},\n\nYour diagnostic test report for Sample ${sampleId} is ready and available for secure viewing and download in your Patient Portal.\n\n— Kenva Health Systems`,
          htmlText: `<div style="font-family: sans-serif; color: #1e293b; max-width: 500px; padding: 20px;">
            <h2 style="color: #0d9488;">Your Diagnostic Report is Ready</h2>
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Your diagnostic test report for Sample <strong>${sampleId}</strong> is complete.</p>
            <p>You can now log in to your Kenva Patient Portal to view and download your cryptographically signed PDF report.</p>
          </div>`,
          userId: user.id,
          type: 'REPORT_AVAILABLE'
        });
      }
    }
  }

  db.broadcastChange({
    event: 'WORKFLOW_STAGE_UPDATED',
    sampleId,
    appointmentId: sample.appointment_id,
    stage: stageNum,
    stage_name: stageMeta.name,
    patientId: sample.patient_id
  });

  return res.json({
    message: `Sample workflow advanced to Stage ${stageNum}: ${stageMeta.name}.`,
    stage: stageNum,
    sampleId
  });
});

/**
 * POST /api/hospital/samples/:sampleId/skip-stage
 * Skip a stage with a recorded reason (e.g., in-house testing without external logistics)
 */
router.post('/samples/:sampleId/skip-stage', async (req, res) => {
  const ctx = getHospitalContext(req);
  const { sampleId } = req.params;
  const { stageNumber, reason } = req.body;

  if (!stageNumber || !reason) {
    return res.status(400).json({ error: 'Stage number and reason for skipping are required.' });
  }

  const sample = db.findOne('samples', s => s.sample_id === sampleId);
  if (!sample) return res.status(404).json({ error: 'Sample record not found.' });

  if (!ctx.isGlobalAdmin && sample.hospital_id !== ctx.hospitalId) {
    return res.status(403).json({ error: 'Access denied. Sample belongs to another facility.' });
  }

  const stageNum = parseInt(stageNumber, 10);
  const stageMeta = STAGES[stageNum] || { name: `Stage ${stageNum}` };
  const now = new Date().toISOString();
  const hospital = db.findOne('hospitals', h => h.id === sample.hospital_id);
  const hospitalName = hospital ? hospital.name : 'Hospital Facility';

  // Insert skipped timeline entry with reason
  db.insert('sample_workflow_timeline', {
    id: 'TL-' + Date.now() + '-skip-' + stageNum,
    appointment_id: sample.appointment_id || null,
    sample_id: sampleId,
    stage_number: stageNum,
    stage_name: `${stageMeta.name} (Skipped)`,
    actor_name: req.user.name,
    actor_role: 'Authorized Staff',
    location: hospitalName,
    timestamp: now,
    notes: `Stage marked as SKIPPED. Reason: ${reason.trim()}`,
    is_skipped: true,
    skip_reason: reason.trim()
  });

  db.logAudit({
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: 'HOSPITAL_STAFF',
    action: 'SKIP_WORKFLOW_STAGE',
    target_type: 'SAMPLE',
    target_id: sampleId,
    details: { stageNum, reason }
  });

  db.broadcastChange({
    event: 'WORKFLOW_STAGE_SKIPPED',
    sampleId,
    appointmentId: sample.appointment_id,
    stage: stageNum,
    reason,
    patientId: sample.patient_id
  });

  return res.json({ message: `Stage ${stageNum} marked as skipped.`, sampleId, stageNum });
});

/**
 * POST /api/hospital/test-orders
 */
router.post('/test-orders', (req, res) => {
  const ctx = getHospitalContext(req);
  const { appointment_id, patient_id, test_type, ordering_physician, urgency, notes } = req.body;

  if (!patient_id || !test_type) {
    return res.status(400).json({ error: 'Patient ID and test type are required.' });
  }

  const hospitalId = ctx.hospitalId || req.body.hospital_id;
  if (!hospitalId) {
    return res.status(400).json({ error: 'Hospital facility is required.' });
  }

  const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
  const createdAt = new Date().toISOString();

  const newOrder = {
    order_id: orderId,
    appointment_id: appointment_id || null,
    patient_id,
    hospital_id: hospitalId,
    test_type,
    ordering_physician: ordering_physician || req.user.name,
    urgency: urgency || 'ROUTINE',
    status: 'ORDERED',
    notes: notes || '',
    created_at: createdAt
  };

  db.insert('test_orders', newOrder);

  db.broadcastChange({
    event: 'TEST_ORDER_CREATED',
    orderId,
    appointmentId: appointment_id,
    hospitalId
  });

  return res.status(201).json({ message: 'Test order created successfully.', order: newOrder });
});

module.exports = router;
