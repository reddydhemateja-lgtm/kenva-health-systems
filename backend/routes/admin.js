const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendNotificationEmail } = require('../services/emailService');

const router = express.Router();

// Apply auth middleware to all admin endpoints
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

/**
 * GET /api/admin/stats
 * Dashboard overview metrics
 */
router.get('/stats', (req, res) => {
  const users = db.find('users', u => u.role === 'PATIENT');
  const patientProfiles = db.find('patient_profiles');
  const appointments = db.find('appointments');
  const testOrders = db.find('test_orders');
  const samples = db.find('samples');
  const reports = db.find('reports');
  const auditLogs = db.find('audit_logs');
  const hospitals = db.find('hospitals');

  const pendingRegistrations = patientProfiles.filter(p => p.approval_status === 'PENDING_APPROVAL').length;
  const approvedAccounts = patientProfiles.filter(p => p.approval_status === 'APPROVED').length;
  const pendingAppointments = appointments.filter(a => a.status === 'PENDING_CONFIRMATION').length;
  const confirmedAppointments = appointments.filter(a => a.status === 'CONFIRMED').length;
  const activeTestOrders = testOrders.filter(o => o.status !== 'TESTING_COMPLETED' && o.status !== 'REPORT_AVAILABLE').length;
  const samplesInTransit = samples.filter(s => s.current_workflow_stage === 6 || s.status_label === 'In Transit').length;
  const testsInProgress = samples.filter(s => s.current_workflow_stage === 8 || s.status_label === 'Testing in Progress').length;
  const completedReports = reports.filter(r => r.is_final === 1).length;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const delayedRecords = samples.filter(s => s.current_workflow_stage < 7 && s.created_at < oneDayAgo).length;

  return res.json({
    totalPatients: patientProfiles.length,
    pendingRegistrations,
    approvedAccounts,
    pendingAppointments,
    confirmedAppointments,
    activeTestOrders,
    samplesInTransit,
    testsInProgress,
    completedReports,
    delayedRecords,
    totalHospitals: hospitals.length,
    totalAuditLogs: auditLogs.length
  });
});

/**
 * GET /api/admin/patients
 * List all patient registrations with status, user details, and active booking codes
 */
router.get('/patients', (req, res) => {
  const profiles = db.find('patient_profiles');
  const users = db.find('users');
  const codes = db.find('booking_access_codes');

  const result = profiles.map(p => {
    const user = users.find(u => u.id === p.user_id) || {};
    const patientCodes = codes.filter(c => c.patient_id === p.patient_id);
    return {
      patient_id: p.patient_id,
      user_id: p.user_id,
      name: user.name || 'Unknown',
      email: user.email || '',
      phone: user.phone || '',
      dob: p.dob,
      city: p.city,
      approval_status: p.approval_status,
      booking_permission: p.booking_permission,
      approved_at: p.approved_at,
      rejection_reason: p.rejection_reason,
      created_at: user.created_at || '',
      booking_codes: patientCodes.map(c => ({
        code: c.code,
        is_redeemed: c.is_redeemed,
        expires_at: c.expires_at,
        created_at: c.created_at
      }))
    };
  });

  return res.json(result);
});

/**
 * POST /api/admin/patients/:patientId/reset-password
 * Admin resets or updates patient password directly
 */
router.post('/patients/:patientId/reset-password', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const profile = db.findOne('patient_profiles', p => p.patient_id === patientId);
    if (!profile) {
      return res.status(404).json({ error: 'Patient profile not found.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.update('users', u => u.id === profile.user_id, { password: hashedPassword });

    db.logAudit({
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: 'ADMIN',
      action: 'ADMIN_RESET_PATIENT_PASSWORD',
      target_type: 'USER',
      target_id: profile.user_id,
      details: { patientId }
    });

    return res.json({ message: `Password for Patient ${patientId} successfully updated by Administrator.` });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Failed to reset patient password.' });
  }
});

/**
 * POST /api/admin/patients/:patientId/approve
 * Approve patient account and generate unique unpredictable booking code
 */
router.post('/patients/:patientId/approve', async (req, res) => {
  try {
    const { patientId } = req.params;
    const patientProfile = db.findOne('patient_profiles', p => p.patient_id === patientId);

    if (!patientProfile) {
      return res.status(404).json({ error: 'Patient profile not found.' });
    }

    const user = db.findOne('users', u => u.id === patientProfile.user_id);
    if (!user) {
      return res.status(404).json({ error: 'Associated user account not found.' });
    }

    // Generate random unpredictable code (e.g., KEN-CODE-9X4A-82B7)
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const bookingCode = `KEN-CODE-${randomHex.substring(0, 4)}-${randomHex.substring(4)}`;
    
    // Set expiry 30 days in future
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const approvedAt = now.toISOString();

    // Update profile
    db.update('patient_profiles', p => p.patient_id === patientId, {
      approval_status: 'APPROVED',
      approved_at: approvedAt
    });

    // Insert booking code
    const codeId = 'BC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    db.insert('booking_access_codes', {
      id: codeId,
      code: bookingCode,
      patient_id: patientId,
      generated_by: req.user.id,
      is_redeemed: 0,
      redeemed_at: null,
      expires_at: expiryDate,
      created_at: approvedAt
    });

    // Log audit
    db.logAudit({
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: 'ADMIN',
      action: 'APPROVE_PATIENT_ACCOUNT',
      target_type: 'PATIENT_PROFILE',
      target_id: patientId,
      details: { bookingCode, expiresAt: expiryDate }
    });

    // Notify Patient via internal portal & configurable email
    const emailResult = await sendNotificationEmail({
      to: user.email,
      subject: 'Kenva Health Systems — Account Approved & Booking Access Code',
      plainText: `Hello ${user.name},\n\nGreat news! Your Kenva Health Systems account (${patientId}) has been approved by our administration.\n\nYour Unique Booking Access Code is: ${bookingCode}\nExpires: ${new Date(expiryDate).toLocaleDateString()}\n\nPlease log in to your patient portal and enter this code under "Unlock Appointment Booking" to enable appointment requests.\n\nThank you,\nKenva Health Systems`,
      htmlText: `<div style="font-family: sans-serif; color: #1e293b;">
        <h2 style="color: #0d9488;">Account Approved!</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Your Kenva Health Systems account (<strong>${patientId}</strong>) is approved.</p>
        <div style="background: #f0fdf4; border: 2px dashed #16a34a; padding: 16px; margin: 16px 0; border-radius: 8px; text-align: center;">
          <div style="font-size: 14px; color: #15803d; text-transform: uppercase; font-weight: bold;">Your One-Time Booking Access Code</div>
          <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #065f46; margin: 8px 0;">${bookingCode}</div>
          <div style="font-size: 12px; color: #166534;">Expires on ${new Date(expiryDate).toLocaleDateString()}</div>
        </div>
        <p>Log in to your Patient Portal and enter this code under "Unlock Appointment Booking" to start scheduling appointments.</p>
      </div>`,
      userId: user.id,
      type: 'BOOKING_CODE_ISSUED'
    });

    return res.json({
      message: 'Patient account approved and booking code generated successfully.',
      patientId,
      bookingCode,
      expiresAt: expiryDate,
      emailStatus: emailResult
    });
  } catch (err) {
    console.error('Approve patient error:', err);
    return res.status(500).json({ error: 'Failed to approve patient account.' });
  }
});

/**
 * POST /api/admin/patients/:patientId/reject
 */
router.post('/patients/:patientId/reject', (req, res) => {
  const { patientId } = req.params;
  const { reason } = req.body;

  const profile = db.findOne('patient_profiles', p => p.patient_id === patientId);
  if (!profile) {
    return res.status(404).json({ error: 'Patient profile not found.' });
  }

  const user = db.findOne('users', u => u.id === profile.user_id);

  db.update('patient_profiles', p => p.patient_id === patientId, {
    approval_status: 'REJECTED',
    rejection_reason: reason || 'Information could not be verified.'
  });

  db.logAudit({
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: 'ADMIN',
    action: 'REJECT_PATIENT_ACCOUNT',
    target_type: 'PATIENT_PROFILE',
    target_id: patientId,
    details: { reason }
  });

  if (user) {
    sendNotificationEmail({
      to: user.email,
      subject: 'Kenva Health Systems — Registration Status Update',
      plainText: `Hello ${user.name},\n\nWe were unable to approve your account at this time.\nReason: ${reason || 'Information could not be verified.'}\n\nPlease contact support for assistance.`,
      htmlText: `<p>Hello ${user.name},</p><p>Your registration could not be approved at this time. Reason: ${reason || 'Information could not be verified.'}</p>`,
      userId: user.id,
      type: 'ACCOUNT_REJECTED'
    });
  }

  return res.json({ message: 'Patient account rejected.', patientId });
});

/**
 * GET /api/admin/appointments
 */
router.get('/appointments', (req, res) => {
  const appointments = db.find('appointments');
  const patientProfiles = db.find('patient_profiles');
  const users = db.find('users');
  const hospitals = db.find('hospitals');

  const result = appointments.map(apt => {
    const profile = patientProfiles.find(p => p.patient_id === apt.patient_id);
    const patientUser = profile ? users.find(u => u.id === profile.user_id) : null;
    const hospital = hospitals.find(h => h.id === apt.hospital_id);

    return {
      ...apt,
      patientName: patientUser ? patientUser.name : 'Unknown Patient',
      patientEmail: patientUser ? patientUser.email : '',
      hospitalName: hospital ? hospital.name : 'Unknown Facility',
      hospitalCity: hospital ? hospital.city : ''
    };
  });

  return res.json(result);
});

/**
 * POST /api/admin/appointments/:appointmentId/status
 */
router.post('/appointments/:appointmentId/status', async (req, res) => {
  const { appointmentId } = req.params;
  const { status, notes } = req.body;

  if (!['CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid appointment status.' });
  }

  const apt = db.findOne('appointments', a => a.appointment_id === appointmentId);
  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found.' });
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
    actor_role: 'ADMIN',
    action: 'UPDATE_APPOINTMENT_STATUS',
    target_type: 'APPOINTMENT',
    target_id: appointmentId,
    details: { oldStatus: apt.status, newStatus: status, notes }
  });

  const profile = db.findOne('patient_profiles', p => p.patient_id === apt.patient_id);
  if (profile) {
    const user = db.findOne('users', u => u.id === profile.user_id);
    if (user) {
      await sendNotificationEmail({
        to: user.email,
        subject: `Kenva Health Systems — Appointment ${status}`,
        plainText: `Hello ${user.name},\n\nYour appointment (${appointmentId}) status has been updated to: ${status}.\nDate: ${apt.preferred_date} at ${apt.preferred_time}.\nNotes: ${notes || 'None'}`,
        htmlText: `<p>Hello <strong>${user.name}</strong>,</p><p>Your appointment status is now <strong>${status}</strong> for ${apt.preferred_date} at ${apt.preferred_time}.</p>`,
        userId: user.id,
        type: 'APPOINTMENT_UPDATE'
      });
    }
  }

  return res.json({ message: `Appointment status updated to ${status}`, appointmentId });
});

/**
 * GET /api/admin/hospitals
 */
router.get('/hospitals', (req, res) => {
  const hospitals = db.find('hospitals');
  return res.json(hospitals);
});

/**
 * POST /api/admin/hospitals
 */
router.post('/hospitals', (req, res) => {
  const { name, code, city, address, contact_email, contact_phone, accreditation } = req.body;

  if (!name || !code || !city || !address) {
    return res.status(400).json({ error: 'Name, code, city, and address are required.' });
  }

  const existing = db.findOne('hospitals', h => h.code.toUpperCase() === code.toUpperCase());
  if (existing) {
    return res.status(400).json({ error: 'Hospital code already exists.' });
  }

  const newHospital = {
    id: 'HOSP-' + Date.now().toString().slice(-4),
    name,
    code: code.toUpperCase(),
    city,
    address,
    contact_email: contact_email || `contact@${code.toLowerCase()}.kenva.local`,
    contact_phone: contact_phone || '+91 877 2299000',
    accreditation: accreditation || 'NABL Accredited Diagnostic Center',
    is_fictional: 0
  };

  db.insert('hospitals', newHospital);

  db.logAudit({
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: 'ADMIN',
    action: 'CREATE_HOSPITAL_FACILITY',
    target_type: 'HOSPITAL',
    target_id: newHospital.id,
    details: { name, code }
  });

  return res.status(201).json(newHospital);
});

/**
 * GET /api/admin/sample-journey
 */
router.get('/sample-journey', (req, res) => {
  const testOrders = db.find('test_orders');
  const samples = db.find('samples');
  const logistics = db.find('logistics_events');
  const labs = db.find('laboratory_records');
  const timelines = db.find('sample_workflow_timeline');
  const patientProfiles = db.find('patient_profiles');
  const users = db.find('users');
  const hospitals = db.find('hospitals');
  const reports = db.find('reports');

  const result = testOrders.map(order => {
    const profile = patientProfiles.find(p => p.patient_id === order.patient_id);
    const patientUser = profile ? users.find(u => u.id === profile.user_id) : null;
    const hospital = hospitals.find(h => h.id === order.hospital_id);
    const sample = samples.find(s => s.order_id === order.order_id);
    const logistic = sample ? logistics.find(l => l.sample_id === sample.sample_id) : null;
    const lab = sample ? labs.find(lb => lb.sample_id === sample.sample_id) : null;
    const report = reports.find(r => r.order_id === order.order_id);
    const timeline = sample ? timelines.filter(t => t.sample_id === sample.sample_id).sort((a,b) => a.stage_number - b.stage_number) : [];

    return {
      order_id: order.order_id,
      patient_id: order.patient_id,
      patientName: patientUser ? patientUser.name : 'Unknown Patient',
      hospitalName: hospital ? hospital.name : 'Unknown Facility',
      test_type: order.test_type,
      ordering_physician: order.ordering_physician,
      urgency: order.urgency,
      orderStatus: order.status,
      created_at: order.created_at,
      sample: sample || null,
      logistics: logistic || null,
      labRecord: lab || null,
      report: report || null,
      timeline
    };
  });

  return res.json(result);
});

/**
 * GET /api/admin/audit-logs
 */
router.get('/audit-logs', (req, res) => {
  const logs = db.find('audit_logs');
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return res.json(logs);
});

/**
 * GET /api/admin/email-config
 */
router.get('/email-config', (req, res) => {
  const conf = db.getEmailConfig();
  return res.json({
    smtp_host: conf.smtp_host || '',
    smtp_port: conf.smtp_port || 587,
    smtp_user: conf.smtp_user || '',
    smtp_pass: conf.smtp_pass ? '********' : '',
    from_email: conf.from_email || '',
    is_enabled: !!conf.is_enabled,
    last_updated: conf.last_updated
  });
});

/**
 * POST /api/admin/email-config
 */
router.post('/email-config', (req, res) => {
  const { smtp_host, smtp_port, smtp_user, smtp_pass, from_email, is_enabled } = req.body;

  const current = db.getEmailConfig();
  const updatedConf = {
    smtp_host: smtp_host !== undefined ? smtp_host : current.smtp_host,
    smtp_port: smtp_port ? parseInt(smtp_port, 10) : current.smtp_port,
    smtp_user: smtp_user !== undefined ? smtp_user : current.smtp_user,
    smtp_pass: (smtp_pass && smtp_pass !== '********') ? smtp_pass : current.smtp_pass,
    from_email: from_email !== undefined ? from_email : current.from_email,
    is_enabled: is_enabled ? 1 : 0
  };

  db.updateEmailConfig(updatedConf);

  db.logAudit({
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: 'ADMIN',
    action: 'UPDATE_EMAIL_CONFIG',
    target_type: 'SYSTEM_CONFIG',
    target_id: 'primary',
    details: { is_enabled: updatedConf.is_enabled, smtp_host: updatedConf.smtp_host }
  });

  return res.json({ message: 'Email provider configuration saved.', is_enabled: updatedConf.is_enabled });
});

module.exports = router;
