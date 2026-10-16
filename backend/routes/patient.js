const express = require('express');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendNotificationEmail } = require('../services/emailService');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('PATIENT'));

/**
 * Standard Clinical Diagnostic Services Catalog
 */
const AVAILABLE_SERVICES = [
  { id: 'CBC', name: 'Complete Blood Count (CBC) with Differential', category: 'Hematology', turnaround: '4-6 Hours' },
  { id: 'CMP', name: 'Comprehensive Metabolic Panel (CMP-14)', category: 'Clinical Biochemistry', turnaround: '6-8 Hours' },
  { id: 'LIPID', name: 'Lipid Profile with Apolipoprotein B', category: 'Cardiovascular', turnaround: '6-8 Hours' },
  { id: 'THYROID', name: 'Comprehensive Thyroid Panel (TSH, FT3, FT4)', category: 'Endocrinology', turnaround: '8-12 Hours' },
  { id: 'HBA1C', name: 'HbA1c Glycated Hemoglobin & Average Glucose', category: 'Diabetes / Metabolism', turnaround: '4-6 Hours' },
  { id: 'RENAL', name: 'Renal Function Profile (KFT with Electrolytes)', category: 'Nephrology', turnaround: '6-8 Hours' },
  { id: 'LIVER', name: 'Liver Function Panel (LFT with Enzymes)', category: 'Hepatology', turnaround: '6-8 Hours' },
  { id: 'VITD', name: 'Vitamin D (25-OH) & Vitamin B12 Immunoassay', category: 'Immunology', turnaround: '12-24 Hours' }
];

/**
 * Helper to ensure patient gets their own record
 */
function getPatientProfileForUser(userId) {
  return db.findOne('patient_profiles', p => p.user_id === userId);
}

/**
 * GET /api/patient/dashboard
 * Patient profile, notifications, appointments, test orders, samples, reports, hospitals, services
 */
router.get('/dashboard', (req, res) => {
  const profile = getPatientProfileForUser(req.user.id);
  if (!profile) {
    return res.status(404).json({ error: 'Patient profile not found.' });
  }

  const user = db.findOne('users', u => u.id === req.user.id);
  const appointments = db.find('appointments', a => a.patient_id === profile.patient_id);
  const hospitals = db.find('hospitals');
  const testOrders = db.find('test_orders', t => t.patient_id === profile.patient_id);
  const samples = db.find('samples', s => s.patient_id === profile.patient_id);
  const reports = db.find('reports', r => r.patient_id === profile.patient_id);
  const notifications = db.find('notifications', n => n.user_id === req.user.id);
  const timelines = db.find('sample_workflow_timeline');

  // Enrich appointments with hospital info & active sample journey
  const enrichedAppointments = appointments.map(apt => {
    const hosp = hospitals.find(h => h.id === apt.hospital_id);
    const order = testOrders.find(o => o.appointment_id === apt.appointment_id);
    const sample = order ? samples.find(s => s.order_id === order.order_id) : samples.find(s => s.appointment_id === apt.appointment_id);
    const orderTimeline = sample
      ? timelines.filter(t => t.sample_id === sample.sample_id).sort((a, b) => a.stage_number - b.stage_number)
      : (apt.timeline || []);

    return {
      ...apt,
      hospitalName: hosp ? hosp.name : 'Clinical Facility',
      hospitalCity: hosp ? hosp.city : '',
      hospitalAddress: hosp ? hosp.address : '',
      order: order || null,
      sample: sample || null,
      timeline: orderTimeline
    };
  });

  // Enrich test orders with sample tracking, timeline, and report
  const enrichedOrders = testOrders.map(order => {
    const sample = samples.find(s => s.order_id === order.order_id);
    const report = reports.find(r => r.order_id === order.order_id);
    const orderTimeline = sample
      ? timelines.filter(t => t.sample_id === sample.sample_id).sort((a, b) => a.stage_number - b.stage_number)
      : [];
    const hosp = hospitals.find(h => h.id === order.hospital_id);

    return {
      ...order,
      hospitalName: hosp ? hosp.name : 'Clinical Facility',
      sample: sample || null,
      report: report || null,
      timeline: orderTimeline
    };
  });

  return res.json({
    profile: {
      patient_id: profile.patient_id,
      name: user ? user.name : 'Patient',
      email: user ? user.email : '',
      phone: user ? user.phone : '',
      dob: profile.dob,
      city: profile.city,
      approval_status: 'APPROVED',
      booking_permission: 1,
      is_verified: user ? user.is_verified : true
    },
    hospitals,
    availableServices: AVAILABLE_SERVICES,
    appointments: enrichedAppointments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    testOrders: enrichedOrders,
    reports: reports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    notifications: notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  });
});

/**
 * POST /api/patient/book-appointment
 * Direct appointment booking for all verified patients
 */
router.post('/book-appointment', async (req, res) => {
  try {
    const profile = getPatientProfileForUser(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Patient profile not found.' });
    }

    const { hospital_id, test_type, preferred_date, preferred_time, reason, symptoms } = req.body;

    if (!hospital_id || !preferred_date || !preferred_time) {
      return res.status(400).json({ error: 'Hospital facility, appointment date, and time slot are required.' });
    }

    const hospital = db.findOne('hospitals', h => h.id === hospital_id);
    if (!hospital) {
      return res.status(404).json({ error: 'Selected hospital facility not found.' });
    }

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const appointmentId = `APT-${new Date().getFullYear()}-${randomDigits}`;
    const createdAt = new Date().toISOString();
    const selectedTest = test_type || 'General Diagnostic Consultation';

    const newAppointment = {
      appointment_id: appointmentId,
      patient_id: profile.patient_id,
      hospital_id,
      test_type: selectedTest,
      preferred_date,
      preferred_time,
      reason: reason || selectedTest,
      symptoms: symptoms || '',
      status: 'PENDING_CONFIRMATION',
      collector_info: null,
      scheduled_collection: null,
      notes: '',
      created_at: createdAt,
      updated_at: createdAt
    };

    db.insert('appointments', newAppointment);

    // Initial Stage 1 timeline record
    const timelineId = 'TL-' + Date.now() + '-1';
    db.insert('sample_workflow_timeline', {
      id: timelineId,
      appointment_id: appointmentId,
      sample_id: null,
      stage_number: 1,
      stage_name: 'Appointment Requested',
      actor_name: req.user.name,
      actor_role: 'Patient',
      location: hospital.name,
      timestamp: createdAt,
      notes: `Patient submitted appointment request for ${selectedTest} on ${preferred_date} at ${preferred_time}`
    });

    // Audit log
    db.logAudit({
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: 'PATIENT',
      action: 'SUBMIT_APPOINTMENT_REQUEST',
      target_type: 'APPOINTMENT',
      target_id: appointmentId,
      details: { hospitalName: hospital.name, test_type: selectedTest, preferred_date, preferred_time }
    });

    // In-app notification for patient
    db.notifyUser({
      user_id: req.user.id,
      title: 'Appointment Request Submitted',
      message: `Your appointment request (${appointmentId}) for ${selectedTest} at ${hospital.name} has been received. Current status: Pending Confirmation.`,
      type: 'APPOINTMENT_SUBMITTED'
    });

    const user = db.findOne('users', u => u.id === req.user.id);

    // Send email notification to patient
    await sendNotificationEmail({
      to: user.email,
      subject: `Kenva Health Systems: Appointment Request Received (${appointmentId})`,
      plainText: `Hello ${user.name},\n\nYour appointment request (${appointmentId}) for ${selectedTest} at ${hospital.name} on ${preferred_date} at ${preferred_time} has been received.\n\nStatus: Pending Confirmation by Hospital.\n\nThank you,\nKenva Health Systems`,
      htmlText: `<div style="font-family: sans-serif; color: #1e293b; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0d9488;">Appointment Request Received</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Your appointment request has been submitted to <strong>${hospital.name}</strong>.</p>
        <div style="background: #f8fafc; border-left: 4px solid #0d9488; padding: 12px; margin: 16px 0;">
          <strong>Booking Reference:</strong> ${appointmentId}<br/>
          <strong>Service / Test:</strong> ${selectedTest}<br/>
          <strong>Preferred Schedule:</strong> ${preferred_date} at ${preferred_time}<br/>
          <strong>Status:</strong> Pending Confirmation
        </div>
        <p style="color: #64748b; font-size: 13px;">Hospital staff will review your request shortly. You can track updates live in your Patient Portal.</p>
      </div>`,
      userId: user.id,
      type: 'APPOINTMENT_SUBMITTED'
    });

    // Broadcast change across live stream so Hospital Portal updates instantly
    db.broadcastChange({
      event: 'APPOINTMENT_REQUESTED',
      appointmentId,
      hospitalId: hospital_id,
      patientId: profile.patient_id,
      patientName: user.name,
      test_type: selectedTest
    });

    return res.status(201).json({
      message: 'Appointment request submitted successfully.',
      appointmentId,
      appointment: {
        ...newAppointment,
        hospitalName: hospital.name,
        hospitalCity: hospital.city
      }
    });
  } catch (err) {
    console.error('Book appointment error:', err);
    return res.status(500).json({ error: 'Failed to submit appointment request.' });
  }
});

/**
 * Legacy stub for verify-booking-code
 */
router.post('/verify-booking-code', (req, res) => {
  return res.json({
    message: 'Booking access is active for your account. You can book appointments directly.',
    booking_permission: 1
  });
});

/**
 * POST /api/patient/notifications/:notifId/read
 */
router.post('/notifications/:notifId/read', (req, res) => {
  const { notifId } = req.params;
  db.update('notifications', n => n.id === notifId && n.user_id === req.user.id, { is_read: 1 });
  return res.json({ message: 'Notification marked as read.' });
});

module.exports = router;
