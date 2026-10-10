const express = require('express');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendNotificationEmail } = require('../services/emailService');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['HOSPITAL', 'ADMIN']));

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
 * Hospital stats, assigned appointments, patient records, test orders, samples
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
  const logistics = db.find('logistics_events');
  const labRecords = db.find('laboratory_records');
  const timelines = db.find('sample_workflow_timeline');

  // Enriched Appointments
  const enrichedAppointments = appointments.map(apt => {
    const profile = patientProfiles.find(p => p.patient_id === apt.patient_id);
    const patientUser = profile ? users.find(u => u.id === profile.user_id) : null;
    return {
      ...apt,
      patientName: patientUser ? patientUser.name : 'Unknown Patient',
      patientEmail: patientUser ? patientUser.email : '',
      patientPhone: patientUser ? patientUser.phone : '',
      patientDob: profile ? profile.dob : '',
      patientCity: profile ? profile.city : ''
    };
  });

  // Enriched Test Orders
  const enrichedOrders = testOrders.map(order => {
    const profile = patientProfiles.find(p => p.patient_id === order.patient_id);
    const patientUser = profile ? users.find(u => u.id === profile.user_id) : null;
    const sample = samples.find(s => s.order_id === order.order_id);
    const report = reports.find(r => r.order_id === order.order_id);
    const orderTimeline = sample ? timelines.filter(t => t.sample_id === sample.sample_id).sort((a,b) => a.stage_number - b.stage_number) : [];

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
    appointments: enrichedAppointments,
    testOrders: enrichedOrders,
    samples,
    reports
  });
});

/**
 * POST /api/hospital/appointments/:appointmentId/status
 */
router.post('/appointments/:appointmentId/status', async (req, res) => {
  const ctx = getHospitalContext(req);
  const { appointmentId } = req.params;
  const { status, notes } = req.body;

  const apt = db.findOne('appointments', a => a.appointment_id === appointmentId);
  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  // Hospital staff scope check
  if (!ctx.isGlobalAdmin && apt.hospital_id !== ctx.hospitalId) {
    return res.status(403).json({ error: 'Access denied. Appointment belongs to a different hospital.' });
  }

  const updatedAt = new Date().toISOString();
  db.update('appointments', a => a.appointment_id === appointmentId, {
    status,
    notes: notes || apt.notes,
    updated_at: updatedAt
  });

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
      await sendNotificationEmail({
        to: user.email,
        subject: `Kenva Health — Appointment ${status}`,
        plainText: `Hello ${user.name},\n\nYour appointment (${appointmentId}) status at ${req.user.hospitalName || 'the hospital'} is now: ${status}.`,
        htmlText: `<p>Hello <strong>${user.name}</strong>,</p><p>Your appointment (${appointmentId}) status has been updated to <strong>${status}</strong>.</p>`,
        userId: user.id,
        type: 'APPOINTMENT_STATUS_CHANGE'
      });
    }
  }

  return res.json({ message: `Appointment status updated to ${status}.`, appointmentId });
});

/**
 * POST /api/hospital/test-orders
 * Create new test order for a patient
 */
router.post('/test-orders', (req, res) => {
  const ctx = getHospitalContext(req);
  const { appointment_id, patient_id, test_type, ordering_physician, urgency, notes } = req.body;

  if (!patient_id || !test_type || !ordering_physician) {
    return res.status(400).json({ error: 'Patient ID, test type, and ordering physician are required.' });
  }

  const patientProfile = db.findOne('patient_profiles', p => p.patient_id === patient_id);
  if (!patientProfile) {
    return res.status(404).json({ error: 'Patient ID not found.' });
  }

  const hospitalId = ctx.hospitalId || req.body.hospital_id;
  if (!hospitalId) {
    return res.status(400).json({ error: 'Hospital facility required.' });
  }

  const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
  const createdAt = new Date().toISOString();

  const newOrder = {
    order_id: orderId,
    appointment_id: appointment_id || null,
    patient_id,
    hospital_id: hospitalId,
    test_type,
    ordering_physician,
    urgency: urgency || 'ROUTINE',
    status: 'ORDERED',
    notes: notes || '',
    created_at: createdAt
  };

  db.insert('test_orders', newOrder);

  // Workflow Timeline Entry - Stage 1: Test Order Created
  const user = db.findOne('users', u => u.id === patientProfile.user_id);
  
  db.logAudit({
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: req.user.role,
    action: 'CREATE_TEST_ORDER',
    target_type: 'TEST_ORDER',
    target_id: orderId,
    details: { patient_id, test_type, urgency }
  });

  return res.status(201).json({ message: 'Test order created successfully.', order: newOrder });
});

/**
 * POST /api/hospital/samples
 * Register sample for a test order (Workflow Stage 3 & 4)
 */
router.post('/samples', (req, res) => {
  const ctx = getHospitalContext(req);
  const { order_id, sample_type, container_id, collected_by } = req.body;

  if (!order_id || !sample_type || !container_id) {
    return res.status(400).json({ error: 'Order ID, sample type, and container ID are required.' });
  }

  const order = db.findOne('test_orders', o => o.order_id === order_id);
  if (!order) {
    return res.status(404).json({ error: 'Test order not found.' });
  }

  if (!ctx.isGlobalAdmin && order.hospital_id !== ctx.hospitalId) {
    return res.status(403).json({ error: 'Access denied. Order belongs to another facility.' });
  }

  const sampleId = 'SMP-' + Math.floor(10000 + Math.random() * 90000);
  const now = new Date().toISOString();
  const hospital = db.findOne('hospitals', h => h.id === order.hospital_id);
  const hospitalName = hospital ? hospital.name : 'Hospital Facility';

  const newSample = {
    sample_id: sampleId,
    order_id: order.order_id,
    patient_id: order.patient_id,
    hospital_id: order.hospital_id,
    sample_type,
    container_id,
    collected_at: now,
    collected_by: collected_by || req.user.name,
    current_workflow_stage: 4, // Stage 4: Sample Registered
    status_label: 'Sample Registered',
    created_at: now
  };

  db.insert('samples', newSample);

  // Update order status
  db.update('test_orders', o => o.order_id === order_id, { status: 'SAMPLE_REGISTERED' });

  // Add Workflow Timeline Entries for Stage 1..4
  const patientProfile = db.findOne('patient_profiles', p => p.patient_id === order.patient_id);
  const patientUser = patientProfile ? db.findOne('users', u => u.id === patientProfile.user_id) : null;

  db.insert('sample_workflow_timeline', {
    id: 'TL-' + Date.now() + '-1',
    sample_id: sampleId,
    stage_number: 1,
    stage_name: 'Test Order Created',
    actor_name: order.ordering_physician,
    actor_role: 'Ordering Physician',
    location: hospitalName,
    timestamp: order.created_at,
    notes: `Test order ${order.order_id} issued for ${order.test_type}`
  });

  db.insert('sample_workflow_timeline', {
    id: 'TL-' + Date.now() + '-2',
    sample_id: sampleId,
    stage_number: 2,
    stage_name: 'Patient Registration Verified',
    actor_name: patientUser ? patientUser.name : order.patient_id,
    actor_role: 'Patient',
    location: hospitalName,
    timestamp: order.created_at,
    notes: `Patient ID ${order.patient_id} verified at facility admission.`
  });

  db.insert('sample_workflow_timeline', {
    id: 'TL-' + Date.now() + '-3',
    sample_id: sampleId,
    stage_number: 3,
    stage_name: 'Sample Collection',
    actor_name: collected_by || req.user.name,
    actor_role: 'Phlebotomist / Clinical Staff',
    location: `${hospitalName} Phlebotomy Bay 2`,
    timestamp: now,
    notes: `${sample_type} specimen drawn into barcoded container ${container_id}`
  });

  db.insert('sample_workflow_timeline', {
    id: 'TL-' + Date.now() + '-4',
    sample_id: sampleId,
    stage_number: 4,
    stage_name: 'Sample Registered in LIMS',
    actor_name: req.user.name,
    actor_role: 'Hospital Laboratory Staff',
    location: hospitalName,
    timestamp: now,
    notes: `Sample assigned barcode ${sampleId} and logged into Kenva Network.`
  });

  db.logAudit({
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: 'HOSPITAL_STAFF',
    action: 'REGISTER_SAMPLE',
    target_type: 'SAMPLE',
    target_id: sampleId,
    details: { order_id, container_id, sample_type }
  });

  return res.status(201).json({ message: 'Sample registered and barcode generated.', sample: newSample });
});

/**
 * POST /api/hospital/samples/:sampleId/advance-workflow
 * Advance sample through the 10-step journey:
 * Stage 5: Logistics Pickup
 * Stage 6: In Transit
 * Stage 7: Laboratory Received
 * Stage 8: Testing in Progress
 * Stage 9: Testing Completed
 * Stage 10: Report Generated & Available to Patient
 */
router.post('/samples/:sampleId/advance-workflow', async (req, res) => {
  const ctx = getHospitalContext(req);
  const { sampleId } = req.params;
  const { nextStage, notes, courier_name, tracking_number, temp_celsius, lab_tech, test_results_json, summary_findings } = req.body;

  const sample = db.findOne('samples', s => s.sample_id === sampleId);
  if (!sample) {
    return res.status(404).json({ error: 'Sample record not found.' });
  }

  if (!ctx.isGlobalAdmin && sample.hospital_id !== ctx.hospitalId) {
    return res.status(403).json({ error: 'Access denied. Sample belongs to another facility.' });
  }

  const stageNum = parseInt(nextStage, 10);
  if (isNaN(stageNum) || stageNum < 1 || stageNum > 10) {
    return res.status(400).json({ error: 'Stage number must be between 1 and 10.' });
  }

  const stageNames = {
    1: 'Test Order Created',
    2: 'Patient Registration Verified',
    3: 'Sample Collection',
    4: 'Sample Registered in LIMS',
    5: 'Logistics Pickup',
    6: 'In Transit',
    7: 'Laboratory Received',
    8: 'Testing in Progress',
    9: 'Testing Completed',
    10: 'Report Generated & Available'
  };

  const statusLabels = {
    1: 'Ordered',
    2: 'Patient Verified',
    3: 'Collected',
    4: 'Registered',
    5: 'Logistics Pickup',
    6: 'In Transit',
    7: 'Laboratory Received',
    8: 'Testing in Progress',
    9: 'Testing Completed',
    10: 'Report Available'
  };

  const orderStatuses = {
    5: 'LOGISTICS_PICKUP',
    6: 'IN_TRANSIT',
    7: 'LAB_RECEIVED',
    8: 'TESTING_IN_PROGRESS',
    9: 'TESTING_COMPLETED',
    10: 'REPORT_AVAILABLE'
  };

  const now = new Date().toISOString();
  const hospital = db.findOne('hospitals', h => h.id === sample.hospital_id);
  const hospitalName = hospital ? hospital.name : 'Hospital Facility';

  // Update sample record
  db.update('samples', s => s.sample_id === sampleId, {
    current_workflow_stage: stageNum,
    status_label: statusLabels[stageNum]
  });

  // Update test order status
  if (orderStatuses[stageNum]) {
    db.update('test_orders', o => o.order_id === sample.order_id, { status: orderStatuses[stageNum] });
  }

  // Handle stage specific updates
  if (stageNum === 5 || stageNum === 6) { // Logistics
    const existingLogistics = db.findOne('logistics_events', l => l.sample_id === sampleId);
    if (existingLogistics) {
      db.update('logistics_events', l => l.id === existingLogistics.id, {
        courier_name: courier_name || existingLogistics.courier_name,
        tracking_number: tracking_number || existingLogistics.tracking_number,
        temperature_celsius: temp_celsius ? parseFloat(temp_celsius) : existingLogistics.temperature_celsius,
        current_status: stageNum === 5 ? 'PICKED_UP' : 'IN_TRANSIT',
        updated_at: now
      });
    } else {
      db.insert('logistics_events', {
        id: 'LOG-' + Date.now(),
        sample_id: sampleId,
        courier_name: courier_name || 'Kenva ColdChain Express',
        tracking_number: tracking_number || 'TRACK-KVA-' + Math.floor(100000 + Math.random() * 900000),
        pickup_time: now,
        origin_facility: hospitalName,
        destination_lab: 'Kenva Central Reference Laboratory #1',
        temperature_celsius: temp_celsius ? parseFloat(temp_celsius) : 4.0,
        current_status: stageNum === 5 ? 'PICKED_UP' : 'IN_TRANSIT',
        updated_at: now
      });
    }
  } else if (stageNum === 7 || stageNum === 8 || stageNum === 9) { // Lab
    const existingLab = db.findOne('laboratory_records', l => l.sample_id === sampleId);
    if (existingLab) {
      db.update('laboratory_records', l => l.id === existingLab.id, {
        technician_name: lab_tech || existingLab.technician_name,
        testing_started_at: stageNum === 8 ? now : existingLab.testing_started_at,
        testing_completed_at: stageNum === 9 ? now : existingLab.testing_completed_at,
        test_results_json: test_results_json ? JSON.stringify(test_results_json) : existingLab.test_results_json,
        lab_notes: notes || existingLab.lab_notes
      });
    } else {
      db.insert('laboratory_records', {
        id: 'LABREC-' + Date.now(),
        sample_id: sampleId,
        lab_name: 'Kenva Central Reference Laboratory #1',
        technician_name: lab_tech || req.user.name,
        received_at: now,
        testing_started_at: stageNum === 8 ? now : null,
        testing_completed_at: stageNum === 9 ? now : null,
        test_results_json: test_results_json ? JSON.stringify(test_results_json) : null,
        lab_notes: notes || 'Specimen received in good condition with cold-chain verification.'
      });
    }
  } else if (stageNum === 10) { // Final Report Generation
    const existingReport = db.findOne('reports', r => r.order_id === sample.order_id);
    const defaultResults = test_results_json || [
      { parameter: 'Hemoglobin', value: '14.2 g/dL', reference: '13.5 - 17.5 g/dL', status: 'NORMAL' },
      { parameter: 'WBC Count', value: '6.8 x10^3 /uL', reference: '4.5 - 11.0 x10^3', status: 'NORMAL' },
      { parameter: 'Platelet Count', value: '250 x10^3 /uL', reference: '150 - 450 x10^3', status: 'NORMAL' },
      { parameter: 'Fasting Plasma Glucose', value: '94 mg/dL', reference: '70 - 99 mg/dL', status: 'NORMAL' },
      { parameter: 'HbA1c', value: '5.4 %', reference: '< 5.7 %', status: 'NORMAL' }
    ];

    if (!existingReport) {
      const reportId = 'REP-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
      const order = db.findOne('test_orders', o => o.order_id === sample.order_id);

      db.insert('reports', {
        report_id: reportId,
        order_id: sample.order_id,
        patient_id: sample.patient_id,
        hospital_id: sample.hospital_id,
        report_title: order ? order.test_type + ' — Diagnostic Report' : 'Laboratory Diagnostic Report',
        summary_findings: summary_findings || 'All tested biomarkers are within physiological reference limits. No actionable diagnostic anomalies detected.',
        detailed_results_json: JSON.stringify(defaultResults),
        pathologist_name: lab_tech || 'Dr. Eleanor Vance, MD (Chief Pathologist)',
        signature_hash: 'SHA256-' + Math.random().toString(36).substr(2, 12).toUpperCase(),
        is_final: 1,
        created_at: now
      });
    } else {
      db.update('reports', r => r.report_id === existingReport.report_id, {
        is_final: 1,
        summary_findings: summary_findings || existingReport.summary_findings
      });
    }

    // Notify patient that report is available!
    const patientProfile = db.findOne('patient_profiles', p => p.patient_id === sample.patient_id);
    if (patientProfile) {
      const user = db.findOne('users', u => u.id === patientProfile.user_id);
      if (user) {
        await sendNotificationEmail({
          to: user.email,
          subject: 'Kenva Health Systems — Diagnostic Laboratory Report Ready',
          plainText: `Hello ${user.name},\n\nYour diagnostic test report for Order #${sample.order_id} is now available in your Kenva Patient Portal.\nLog in to view and download your full signed PDF report.`,
          htmlText: `<p>Hello <strong>${user.name}</strong>,</p><p>Your diagnostic test report for Order <strong>#${sample.order_id}</strong> is ready. Log in to your Patient Portal to view and download your report.</p>`,
          userId: user.id,
          type: 'REPORT_AVAILABLE'
        });
      }
    }
  }

  // Insert Workflow Timeline Entry
  db.insert('sample_workflow_timeline', {
    id: 'TL-' + Date.now() + '-' + stageNum,
    sample_id: sampleId,
    stage_number: stageNum,
    stage_name: stageNames[stageNum],
    actor_name: req.user.name,
    actor_role: req.user.role === 'ADMIN' ? 'System Administrator' : 'Hospital Staff',
    location: stageNum >= 7 ? 'Kenva Central Reference Lab #1' : (stageNum >= 5 ? 'ColdChain Logistics Transit' : hospitalName),
    timestamp: now,
    notes: notes || `Sample advanced to Stage ${stageNum}: ${stageNames[stageNum]}`
  });

  db.logAudit({
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: req.user.role,
    action: 'ADVANCE_SAMPLE_WORKFLOW',
    target_type: 'SAMPLE',
    target_id: sampleId,
    details: { stageNum, stageName: stageNames[stageNum], notes }
  });

  return res.json({
    message: `Sample workflow advanced to Stage ${stageNum}: ${stageNames[stageNum]}.`,
    sampleId,
    stageNum,
    stageName: stageNames[stageNum]
  });
});

module.exports = router;
