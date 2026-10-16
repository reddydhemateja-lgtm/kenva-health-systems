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
      is_verified: false,
      created_at: createdAt
    });

    // Insert Patient Profile (Immediately approved and booking-ready upon OTP verification)
    db.insert('patient_profiles', {
      patient_id: patientId,
      user_id: userId,
      dob,
      city,
      approval_status: 'APPROVED',
      booking_permission: 1,
      approved_at: createdAt,
      rejection_reason: null
    });

    // Generate Verification OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const otpId = 'OTP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

    db.delete('login_otps', o => o.user_id === userId);
    db.insert('login_otps', {
      id: otpId,
      user_id: userId,
      otp_hash: otp,
      expires_at: expiresAt,
      used: false,
      role: 'PATIENT',
      expected_role: 'PATIENT'
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

    // Send OTP verification email
    const emailResult = await sendNotificationEmail({
      to: email,
      subject: 'Kenva Health Systems: Verify Your Email Registration',
      plainText: `Hello ${name},\n\nYour Kenva Health Systems verification code is: ${otp}\n\nEnter this 6-digit code to activate your account and access appointment booking.\n\n— Kenva Health Systems`,
      htmlText: `<div style="font-family: sans-serif; color: #1e293b; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0d9488;">Welcome to Kenva Health Systems</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your registration is complete! Your assigned Patient ID is <strong>${patientId}</strong>.</p>
        <p>Please enter the verification code below to activate your account and start booking appointments:</p>
        <div style="background: #f0fdfa; border: 2px solid #0d9488; border-radius: 8px; text-align: center; padding: 20px; margin: 20px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0d9488; font-family: monospace;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 12px;">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>`,
      userId,
      type: 'REGISTRATION_OTP'
    });

    const smtpConfigured = emailResult && emailResult.sent;
    const parts = email.split('@');
    const maskedEmail = parts[0][0] + '*'.repeat(Math.max(parts[0].length - 1, 4)) + '@' + parts[1];

    return res.status(201).json({
      message: 'Registration successful. Please enter the 6-digit OTP code to verify your email.',
      patientId,
      userId,
      email,
      maskedEmail,
      demoOtp: smtpConfigured ? undefined : otp,
      smtpConfigured: !!smtpConfigured,
      status: 'VERIFICATION_REQUIRED'
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

/** Generate a 6-digit numeric OTP */
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Resolve user + related profile from email/patientId identifier */
function resolveUser(cleanId) {
  let user = null;
  let patientProfile = null;
  let hospitalStaff = null;
  let hospitalInfo = null;

  if (cleanId.toUpperCase().startsWith('KEN-P-')) {
    patientProfile = db.findOne('patient_profiles', p => p.patient_id.toUpperCase() === cleanId.toUpperCase());
    if (patientProfile) user = db.findOne('users', u => u.id === patientProfile.user_id);
  }
  if (!user) {
    user = db.findOne('users', u => u.email.toLowerCase() === cleanId.toLowerCase());
    if (user && user.role === 'PATIENT') {
      patientProfile = db.findOne('patient_profiles', p => p.user_id === user.id);
    }
  }
  if (user && user.role === 'HOSPITAL') {
    hospitalStaff = db.findOne('hospital_staff', s => s.user_id === user.id);
    if (hospitalStaff) hospitalInfo = db.findOne('hospitals', h => h.id === hospitalStaff.hospital_id);
  }
  return { user, patientProfile, hospitalStaff, hospitalInfo };
}

/**
 * POST /api/auth/login
 * - ADMIN / HOSPITAL: direct JWT on valid credentials (no OTP)
 * - PATIENT: OTP emailed, must verify via /verify-otp
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password, expectedRole } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/ID and password are required.' });
    }

    const { user, patientProfile, hospitalStaff, hospitalInfo } = resolveUser(identifier.trim());

    if (!user) return res.status(401).json({ error: 'Invalid login credentials.' });
    if (expectedRole && user.role !== expectedRole) {
      return res.status(403).json({ error: `This portal is reserved for ${expectedRole.toLowerCase()} accounts.` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid login credentials.' });

    // ── ADMIN & HOSPITAL: direct JWT — no OTP required ──────────────────
    if (user.role === 'ADMIN' || user.role === 'HOSPITAL') {
      let hospitalStaffInfo = null;
      let hospitalInfo = null;
      if (user.role === 'HOSPITAL') {
        hospitalStaffInfo = db.findOne('hospital_staff', s => s.user_id === user.id);
        if (hospitalStaffInfo) hospitalInfo = db.findOne('hospitals', h => h.id === hospitalStaffInfo.hospital_id);
      }
      const payload = {
        id: user.id, email: user.email, name: user.name, role: user.role,
        patientId: null,
        hospitalId: hospitalStaffInfo ? hospitalStaffInfo.hospital_id : null,
        hospitalName: hospitalInfo ? hospitalInfo.name : null
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
      db.logAudit({
        actor_id: user.id, actor_name: user.name, actor_role: user.role,
        action: 'USER_LOGIN_DIRECT', target_type: 'USER', target_id: user.id,
        details: { role: user.role }
      });
      return res.json({
        otpSent: false,
        token,
        user: {
          id: user.id, name: user.name, email: user.email, role: user.role,
          patientProfile: null,
          hospitalStaff: hospitalStaffInfo ? {
            hospital_id: hospitalStaffInfo.hospital_id,
            hospital_name: hospitalInfo ? hospitalInfo.name : '',
            department: hospitalStaffInfo.department,
            role_title: hospitalStaffInfo.role_title
          } : null
        }
      });
    }

    // ── PATIENT: OTP via email ────────────────────────────────────────────
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const otpId = 'OTP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

    db.delete('login_otps', o => o.user_id === user.id);
    db.insert('login_otps', {
      id: otpId,
      user_id: user.id,
      otp_hash: otp,
      expires_at: expiresAt,
      used: false,
      role: user.role,
      expected_role: expectedRole || null
    });

    const parts = user.email.split('@');
    const maskedEmail = parts[0][0] + '*'.repeat(Math.max(parts[0].length - 1, 4)) + '@' + parts[1];

    const emailResult = await sendNotificationEmail({
      to: user.email,
      subject: 'Kenva Health Systems — Your Login OTP',
      plainText: `Hello ${user.name},\n\nYour one-time login code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\n— Kenva Health Systems`,
      htmlText: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #0b132b; color: #f8fafc; border-radius: 16px; padding: 32px;">
          <div style="text-align:center; margin-bottom: 24px;">
            <div style="display:inline-block; background:#14b8a6; border-radius:12px; padding:10px 16px; font-size:20px; font-weight:700; letter-spacing:1px; color:#fff;">KENVA HEALTH</div>
          </div>
          <h2 style="color:#2dd4bf; font-size:22px; margin-bottom:8px;">Your Login Verification Code</h2>
          <p style="color:#cbd5e1; margin-bottom:20px;">Hello <strong>${user.name}</strong>, enter this code to complete your login:</p>
          <div style="background:#111d38; border:2px solid #14b8a6; border-radius:12px; text-align:center; padding:24px; margin:20px 0;">
            <span style="font-size:40px; font-weight:800; letter-spacing:12px; color:#2dd4bf; font-family:monospace;">${otp}</span>
          </div>
          <p style="color:#64748b; font-size:13px;">⏰ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <hr style="border-color:#1e293b; margin:24px 0;" />
          <p style="color:#475569; font-size:12px;">A Digital Nervous System for Modern Clinics — Kenva Health Systems</p>
        </div>`,
      userId: user.id,
      type: 'LOGIN_OTP'
    });

    const smtpConfigured = emailResult && emailResult.sent;
    console.log(`[AUTH] Patient OTP for ${user.email}: ${otp} (SMTP sent: ${smtpConfigured})`);

    return res.json({
      otpSent: true,
      maskedEmail,
      email: user.email,
      userId: user.id,
      demoOtp: smtpConfigured ? undefined : otp,
      message: smtpConfigured
        ? `A 6-digit verification code has been sent to ${maskedEmail}. It expires in 10 minutes.`
        : `Email service is in local demo mode. Verification code: ${otp}`
    });
  } catch (err) {
    console.error('Login Step 1 error:', err);
    return res.status(500).json({ error: 'Server error during authentication.' });
  }
});

/**
 * POST /api/auth/verify-otp  — STEP 2
 * Verify OTP → issue full JWT + return user profile
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      return res.status(400).json({ error: 'User ID and OTP code are required.' });
    }

    const otpRecord = db.findOne('login_otps', o => o.user_id === userId && !o.used);
    if (!otpRecord) {
      return res.status(401).json({ error: 'No active OTP found. Please log in again.' });
    }
    if (new Date() > new Date(otpRecord.expires_at)) {
      db.delete('login_otps', o => o.id === otpRecord.id);
      return res.status(401).json({ error: 'OTP has expired. Please log in again.' });
    }
    if (otpRecord.otp_hash !== otp.trim()) {
      return res.status(401).json({ error: 'Invalid OTP. Please check your email and try again.' });
    }

    // Mark OTP as used
    db.update('login_otps', o => o.id === otpRecord.id, { used: true });

    const user = db.findOne('users', u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    let patientProfile = null;
    if (user.role === 'PATIENT') {
      patientProfile = db.findOne('patient_profiles', p => p.user_id === user.id);
    }
    let hospitalStaff = null;
    let hospitalInfo = null;
    if (user.role === 'HOSPITAL') {
      hospitalStaff = db.findOne('hospital_staff', s => s.user_id === user.id);
      if (hospitalStaff) hospitalInfo = db.findOne('hospitals', h => h.id === hospitalStaff.hospital_id);
    }

    const payload = {
      id: user.id, email: user.email, name: user.name, role: user.role,
      patientId: patientProfile ? patientProfile.patient_id : null,
      hospitalId: hospitalStaff ? hospitalStaff.hospital_id : null,
      hospitalName: hospitalInfo ? hospitalInfo.name : null
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    db.logAudit({
      actor_id: user.id, actor_name: user.name, actor_role: user.role,
      action: 'USER_LOGIN_OTP_VERIFIED', target_type: 'USER', target_id: user.id,
      details: { role: user.role }
    });

    const wasUnverified = !user.is_verified;
    db.update('users', u => u.id === userId, { is_verified: true });

    if (wasUnverified) {
      await sendNotificationEmail({
        to: user.email,
        subject: 'Kenva Health Systems: Registration & Verification Complete',
        plainText: `Hello ${user.name},\n\nYour registration and email verification with Kenva Health Systems is complete! Your account is active and you can now log in and book diagnostic appointments.\n\nThank you for choosing Kenva.`,
        htmlText: `<div style="font-family: sans-serif; color: #1e293b; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #0d9488;">Registration & Verification Complete</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>Your email has been successfully verified! Your Kenva Health account is fully active.</p>
          <p>You can now book diagnostic appointments directly with any accredited partner facility.</p>
        </div>`,
        userId: user.id,
        type: 'ACCOUNT_VERIFIED'
      });
    }

    return res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        patientProfile: patientProfile ? {
          patient_id: patientProfile.patient_id,
          approval_status: patientProfile.approval_status,
          booking_permission: patientProfile.booking_permission,
          dob: patientProfile.dob, city: patientProfile.city
        } : null,
        hospitalStaff: hospitalStaff ? {
          hospital_id: hospitalStaff.hospital_id,
          hospital_name: hospitalInfo ? hospitalInfo.name : '',
          department: hospitalStaff.department, role_title: hospitalStaff.role_title
        } : null
      }
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ error: 'Server error during OTP verification.' });
  }
});

/**
 * POST /api/auth/resend-otp
 * Resend a fresh OTP for the same userId (rate-limited by 60s gap via expires_at check)
 */
router.post('/resend-otp', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required.' });
    const user = db.findOne('users', u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Allow resend only if last OTP was issued > 60s ago
    const existing = db.findOne('login_otps', o => o.user_id === userId && !o.used);
    if (existing) {
      const issuedAt = new Date(existing.expires_at).getTime() - 10 * 60 * 1000;
      if (Date.now() - issuedAt < 60 * 1000) {
        return res.status(429).json({ error: 'Please wait at least 60 seconds before requesting a new code.' });
      }
    }
    db.delete('login_otps', o => o.user_id === userId);
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    db.insert('login_otps', {
      id: 'OTP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      user_id: userId, otp_hash: otp,
      expires_at: expiresAt, used: false
    });

    await sendNotificationEmail({
      to: user.email,
      subject: 'Kenva Health Systems — New Login OTP',
      plainText: `Hello ${user.name},\n\nYour new login code is: ${otp}\n\nExpires in 10 minutes.`,
      htmlText: `<div style="font-family:sans-serif;background:#0b132b;color:#f8fafc;padding:32px;border-radius:16px;"><h2 style="color:#2dd4bf;">New Verification Code</h2><p>Hello <strong>${user.name}</strong>,</p><div style="background:#111d38;border:2px solid #14b8a6;border-radius:12px;text-align:center;padding:24px;margin:20px 0;"><span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#2dd4bf;font-family:monospace;">${otp}</span></div><p style="color:#64748b;font-size:13px;">Expires in 10 minutes.</p></div>`,
      userId: user.id,
      type: 'LOGIN_OTP_RESEND'
    });
    const smtpConfigured = emailResult && emailResult.sent;
    const parts = user.email.split('@');
    const maskedEmail = parts[0][0] + '*'.repeat(Math.max(parts[0].length - 1, 4)) + '@' + parts[1];
    return res.json({
      otpSent: true,
      maskedEmail,
      demoOtp: smtpConfigured ? undefined : otp,
      message: 'A new code has been sent to your email.'
    });
  } catch (err) {
    console.error('Resend OTP error:', err);
    return res.status(500).json({ error: 'Server error resending OTP.' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request a password reset code
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required.' });

    const user = db.findOne('users', u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      // Do not disclose user existence
      return res.json({ message: 'If an account exists with this email, a reset code has been sent.' });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const otpId = 'OTP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

    db.delete('login_otps', o => o.user_id === user.id);
    db.insert('login_otps', {
      id: otpId,
      user_id: user.id,
      otp_hash: otp,
      expires_at: expiresAt,
      used: false,
      role: user.role
    });

    const emailResult = await sendNotificationEmail({
      to: user.email,
      subject: 'Kenva Health Systems: Password Reset Code',
      plainText: `Hello ${user.name},\n\nYour password reset code is: ${otp}\n\nExpires in 10 minutes. Do not share this code.`,
      htmlText: `<div style="font-family: sans-serif; color: #1e293b; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0d9488;">Password Reset Request</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Use the code below to reset your password:</p>
        <div style="background: #f0fdfa; border: 2px solid #0d9488; border-radius: 8px; text-align: center; padding: 20px; margin: 20px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0d9488; font-family: monospace;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 12px;">This code expires in 10 minutes.</p>
      </div>`,
      userId: user.id,
      type: 'PASSWORD_RESET_OTP'
    });

    const smtpConfigured = emailResult && emailResult.sent;
    const parts = user.email.split('@');
    const maskedEmail = parts[0][0] + '*'.repeat(Math.max(parts[0].length - 1, 4)) + '@' + parts[1];

    return res.json({
      otpSent: true,
      userId: user.id,
      maskedEmail,
      demoOtp: smtpConfigured ? undefined : otp,
      message: 'If an account exists with this email, a reset code has been sent.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Server error processing password reset.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using OTP
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { userId, otp, newPassword } = req.body;
    if (!userId || !otp || !newPassword) {
      return res.status(400).json({ error: 'User ID, OTP code, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const otpRecord = db.findOne('login_otps', o => o.user_id === userId && !o.used);
    if (!otpRecord) {
      return res.status(401).json({ error: 'Invalid or expired reset code. Please request a new one.' });
    }

    if (new Date() > new Date(otpRecord.expires_at)) {
      db.delete('login_otps', o => o.id === otpRecord.id);
      return res.status(401).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    if (otpRecord.otp_hash !== otp.trim()) {
      return res.status(401).json({ error: 'Invalid reset code. Please check and try again.' });
    }

    db.update('login_otps', o => o.id === otpRecord.id, { used: true });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.update('users', u => u.id === userId, { password: hashedPassword });

    const user = db.findOne('users', u => u.id === userId);

    db.logAudit({
      actor_id: userId,
      actor_name: user ? user.name : 'User',
      actor_role: user ? user.role : 'PATIENT',
      action: 'USER_PASSWORD_RESET',
      target_type: 'USER',
      target_id: userId,
      details: { email: user ? user.email : '' }
    });

    return res.json({ message: 'Password updated successfully. You can now log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Server error updating password.' });
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
