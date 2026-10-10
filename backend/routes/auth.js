const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { sendNotificationEmail } = require('../services/emailService');

const router = express.Router();

/**
 * Generate next Patient ID (e.g., KEN-P-1001, KEN-P-1002...)
 */
function generatePatientId() {
  const patients = db.find('patient_profiles');
  let maxNum = 1000;
  patients.forEach(p => {
    if (p.patient_id && p.patient_id.startsWith('KEN-P-')) {
      const num = parseInt(p.patient_id.replace('KEN-P-', ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  return `KEN-P-${maxNum + 1}`;
}

/**
 * POST /api/auth/register-patient
 */
router.post('/register-patient', async (req, res) => {
  try {
    const { name, email, phone, dob, city, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !dob || !city || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check existing email
    const existingUser = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = 'USR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const patientId = generatePatientId();
    const createdAt = new Date().toISOString();

    // Insert User
    db.insert('users', {
      id: userId,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'PATIENT',
      name,
      phone: phone || '',
      created_at: createdAt
    });

    // Insert Patient Profile
    db.insert('patient_profiles', {
      patient_id: patientId,
      user_id: userId,
      dob,
      city,
      approval_status: 'PENDING_APPROVAL',
      booking_permission: 0,
      approved_at: null,
      rejection_reason: null
    });

    // Audit log
    db.logAudit({
      actor_id: userId,
      actor_name: name,
      actor_role: 'PATIENT',
      action: 'PATIENT_REGISTERED',
      target_type: 'PATIENT_PROFILE',
      target_id: patientId,
      details: { email, city, patientId }
    });

    // Notify Patient via email service if configured / in-app
    await sendNotificationEmail({
      to: email,
      subject: 'Kenva Health Systems — Registration Received',
      plainText: `Hello ${name},\n\nYour registration with Kenva Health Systems is complete! Your assigned Patient ID is ${patientId}.\nYour account is currently awaiting administrator approval. Once approved, you will receive a booking access code in your portal to unlock appointment scheduling.\n\nThank you for choosing Kenva.`,
      htmlText: `<div style="font-family: sans-serif; color: #1e293b;">
        <h2 style="color: #0d9488;">Welcome to Kenva Health Systems</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your registration is complete! Your assigned Patient ID is <strong>${patientId}</strong>.</p>
        <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px; margin: 16px 0;">
          <strong>Account Status:</strong> Pending Administrator Approval.<br/>
          You will receive a booking access code inside your portal once your account is reviewed.
        </div>
        <p>Thank you for choosing Kenva Health Systems.</p>
      </div>`,
      userId,
      type: 'ACCOUNT_REGISTRATION'
    });

    return res.status(201).json({
      message: 'Registration successful! Account is awaiting administrator approval.',
      patientId,
      status: 'PENDING_APPROVAL',
      notice: 'Your account is awaiting administrator approval. You will receive a booking access code after approval.'
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

/**
 * POST /api/auth/login
 * Supports logging in with Email OR Patient ID for Patients, and Email for Staff/Admins
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password, expectedRole } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/ID and password are required.' });
    }

    const cleanId = identifier.trim();

    // Check if cleanId matches a Patient ID
    let user = null;
    let patientProfile = null;

    if (cleanId.toUpperCase().startsWith('KEN-P-')) {
      patientProfile = db.findOne('patient_profiles', p => p.patient_id.toUpperCase() === cleanId.toUpperCase());
      if (patientProfile) {
        user = db.findOne('users', u => u.id === patientProfile.user_id);
      }
    }

    if (!user) {
      user = db.findOne('users', u => u.email.toLowerCase() === cleanId.toLowerCase());
      if (user && user.role === 'PATIENT') {
        patientProfile = db.findOne('patient_profiles', p => p.user_id === user.id);
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid login credentials.' });
    }

    if (expectedRole && user.role !== expectedRole) {
      return res.status(403).json({ error: `This portal is reserved for ${expectedRole.toLowerCase()} accounts.` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid login credentials.' });
    }

    // Get staff record if hospital staff
    let hospitalStaff = null;
    let hospitalInfo = null;
    if (user.role === 'HOSPITAL') {
      hospitalStaff = db.findOne('hospital_staff', s => s.user_id === user.id);
      if (hospitalStaff) {
        hospitalInfo = db.findOne('hospitals', h => h.id === hospitalStaff.hospital_id);
      }
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      patientId: patientProfile ? patientProfile.patient_id : null,
      hospitalId: hospitalStaff ? hospitalStaff.hospital_id : null,
      hospitalName: hospitalInfo ? hospitalInfo.name : null
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    // Audit log
    db.logAudit({
      actor_id: user.id,
      actor_name: user.name,
      actor_role: user.role,
      action: 'USER_LOGIN',
      target_type: 'USER',
      target_id: user.id,
      details: { role: user.role }
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        patientProfile: patientProfile ? {
          patient_id: patientProfile.patient_id,
          approval_status: patientProfile.approval_status,
          booking_permission: patientProfile.booking_permission,
          dob: patientProfile.dob,
          city: patientProfile.city
        } : null,
        hospitalStaff: hospitalStaff ? {
          hospital_id: hospitalStaff.hospital_id,
          hospital_name: hospitalInfo ? hospitalInfo.name : '',
          department: hospitalStaff.department,
          role_title: hospitalStaff.role_title
        } : null
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during authentication.' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, (req, res) => {
  const user = db.findOne('users', u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  let patientProfile = null;
  if (user.role === 'PATIENT') {
    patientProfile = db.findOne('patient_profiles', p => p.user_id === user.id);
  }

  let hospitalStaff = null;
  let hospitalInfo = null;
  if (user.role === 'HOSPITAL') {
    hospitalStaff = db.findOne('hospital_staff', s => s.user_id === user.id);
    if (hospitalStaff) {
      hospitalInfo = db.findOne('hospitals', h => h.id === hospitalStaff.hospital_id);
    }
  }

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at,
      patientProfile,
      hospitalStaff: hospitalStaff ? {
        hospital_id: hospitalStaff.hospital_id,
        hospital_name: hospitalInfo ? hospitalInfo.name : '',
        department: hospitalStaff.department,
        role_title: hospitalStaff.role_title
      } : null
    }
  });
});

module.exports = router;
