const express = require('express');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendNotificationEmail } = require('../services/emailService');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('PATIENT'));

/**
 * Helper to ensure patient gets their own record
 */
function getPatientProfileForUser(userId) {
  return db.findOne('patient_profiles', p => p.user_id === userId);
}

/**
 * GET /api/patient/dashboard
 * Patient profile, approval status, booking permission, notifications, appointments, test orders, reports
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

  // Enrich appointments with hospital info
  const enrichedAppointments = appointments.map(apt => {
    const hosp = hospitals.find(h => h.id === apt.hospital_id);
    return {
      ...apt,
      hospitalName: hosp ? hosp.name : 'Unknown Hospital',
      hospitalCity: hosp ? hosp.city : '',
      hospitalAddress: hosp ? hosp.address : ''
    };
  });

  // Enrich test orders with sample tracking, timeline, and report
  const enrichedOrders = testOrders.map(order => {
    const sample = samples.find(s => s.order_id === order.order_id);
    const report = reports.find(r => r.order_id === order.order_id);
    const orderTimeline = sample ? timelines.filter(t => t.sample_id === sample.sample_id).sort((a,b) => a.stage_number - b.stage_number) : [];
    const hosp = hospitals.find(h => h.id === order.hospital_id);

    return {
      ...order,
      hospitalName: hosp ? hosp.name : '',
      sample: sample || null,
      report: report || null,
      timeline: orderTimeline
    };
  });

  // Booking codes for patient
  const bookingCodes = db.find('booking_access_codes', c => c.patient_id === profile.patient_id);
  const activeCode = bookingCodes.find(c => c.is_redeemed === 0);

  return res.json({
    profile: {
      patient_id: profile.patient_id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      dob: profile.dob,
      city: profile.city,
      approval_status: profile.approval_status,
      booking_permission: profile.booking_permission,
      approved_at: profile.approved_at,
      rejection_reason: profile.rejection_reason,
      activeCodePrompt: activeCode ? true : false
    },
    hospitals,
    appointments: enrichedAppointments,
    testOrders: enrichedOrders,
    reports,
    notifications: notifications.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
  });
});

/**
 * POST /api/patient/verify-booking-code
 * Redeem unpredictable booking code
 */
router.post('/verify-booking-code', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Please enter your booking access code.' });
  }

  const profile = getPatientProfileForUser(req.user.id);
  if (!profile) {
    return res.status(404).json({ error: 'Patient profile not found.' });
  }

  if (profile.approval_status !== 'APPROVED') {
    return res.status(403).json({ error: 'Your account is not approved yet.' });
  }

  if (profile.booking_permission === 1) {
    return res.json({ message: 'Booking permission has already been activated for your account.', booking_permission: 1 });
  }

  const cleanCode = code.trim().toUpperCase();
  const codeRecord = db.findOne('booking_access_codes', c => c.code.toUpperCase() === cleanCode);

  if (!codeRecord) {
    return res.status(400).json({ error: 'Invalid booking access code. Please check the code and try again.' });
  }

  // Verification checks:
  // 1. Belongs to this patient
  if (codeRecord.patient_id !== profile.patient_id) {
    return res.status(403).json({ error: 'This booking access code is assigned to a different patient account.' });
  }

  // 2. Already redeemed?
  if (codeRecord.is_redeemed === 1) {
    return res.status(400).json({ error: 'This booking access code has already been redeemed.' });
  }

  // 3. Expired?
  if (new Date(codeRecord.expires_at) < new Date()) {
    return res.status(400).json({ error: 'This booking access code has expired. Please contact support.' });
  }

  const now = new Date().toISOString();

  // Mark code as redeemed
  db.update('booking_access_codes', c => c.id === codeRecord.id, {
    is_redeemed: 1,
    redeemed_at: now
  });

  // Save booking permission permanently to patient account
  db.update('patient_profiles', p => p.patient_id === profile.patient_id, {
    booking_permission: 1
  });

  // Audit log
  db.logAudit({
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: 'PATIENT',
    action: 'REDEEM_BOOKING_CODE',
    target_type: 'BOOKING_CODE',
    target_id: codeRecord.id,
    details: { code: cleanCode, patient_id: profile.patient_id }
  });

  db.notifyUser({
    user_id: req.user.id,
    title: 'Booking Access Activated!',
    message: 'Your booking access code has been verified. You can now submit appointment requests anytime.',
    type: 'BOOKING_CODE_REDEEMED'
  });

  return res.json({
    message: 'Booking access code successfully verified! You can now request appointments with any Kenva partner hospital.',
    booking_permission: 1
  });
});

/**
 * POST /api/patient/book-appointment
 * Submit appointment request
 */
router.post('/book-appointment', async (req, res) => {
  try {
    const profile = getPatientProfileForUser(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Patient profile not found.' });
    }

    if (profile.booking_permission !== 1) {
      return res.status(403).json({ error: 'You must redeem your booking access code before scheduling appointments.' });
    }

    const { hospital_id, preferred_date, preferred_time, reason, symptoms } = req.body;

    if (!hospital_id || !preferred_date || !preferred_time || !reason) {
      return res.status(400).json({ error: 'Hospital, preferred date, time, and reason for appointment are required.' });
    }

    const hospital = db.findOne('hospitals', h => h.id === hospital_id);
    if (!hospital) {
      return res.status(404).json({ error: 'Selected hospital facility not found.' });
    }

    // Auto-generate Appointment ID (APT-2026-XXXX)
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const appointmentId = `APT-${new Date().getFullYear()}-${randomDigits}`;
    const createdAt = new Date().toISOString();

    const newAppointment = {
      appointment_id: appointmentId,
      patient_id: profile.patient_id,
      hospital_id,
      preferred_date,
      preferred_time,
      reason,
      symptoms: symptoms || '',
      status: 'PENDING_CONFIRMATION',
      notes: '',
      created_at: createdAt,
      updated_at: createdAt
    };

    db.insert('appointments', newAppointment);

    db.logAudit({
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: 'PATIENT',
      action: 'SUBMIT_APPOINTMENT_REQUEST',
      target_type: 'APPOINTMENT',
      target_id: appointmentId,
      details: { hospitalName: hospital.name, preferred_date, preferred_time }
    });

    const user = db.findOne('users', u => u.id === req.user.id);

    // Send email notification to patient
    await sendNotificationEmail({
      to: user.email,
      subject: `Kenva Health Systems — Appointment Request Submitted (${appointmentId})`,
      plainText: `Hello ${user.name},\n\nYour appointment request at ${hospital.name} for ${preferred_date} at ${preferred_time} has been submitted.\n\nStatus: Pending Confirmation by Hospital / Admin.\nAppointment ID: ${appointmentId}`,
      htmlText: `<p>Hello <strong>${user.name}</strong>,</p><p>Your appointment request (ID: <strong>${appointmentId}</strong>) at <strong>${hospital.name}</strong> for <strong>${preferred_date}</strong> at <strong>${preferred_time}</strong> has been received and is currently <em>Pending Confirmation</em>.</p>`,
      userId: user.id,
      type: 'APPOINTMENT_SUBMITTED'
    });

    return res.status(201).json({
      message: 'Appointment request submitted successfully. Initial status set to Pending Confirmation.',
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
 * POST /api/patient/notifications/:notifId/read
 */
router.post('/notifications/:notifId/read', (req, res) => {
  const { notifId } = req.params;
  db.update('notifications', n => n.id === notifId && n.user_id === req.user.id, { is_read: 1 });
  return res.json({ message: 'Notification marked as read.' });
});

module.exports = router;
