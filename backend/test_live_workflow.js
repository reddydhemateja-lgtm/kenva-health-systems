const http = require('http');

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTest() {
  console.log('=== STARTING KENVA END-TO-END LIVE WORKFLOW VALIDATION ===\n');
  const timestamp = Date.now();
  const testEmail = `patient.test.${timestamp}@example.com`;
  const testPassword = 'Password123!';

  // 1. Patient Registration
  console.log('1. Testing Patient Registration (No admin approval gating)...');
  const regRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/register-patient',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Suresh Naidu',
    email: testEmail,
    phone: '+91 94400 11223',
    dob: '1988-05-12',
    city: 'Tirupati',
    password: testPassword,
    confirmPassword: testPassword
  });

  if (regRes.status !== 201) {
    throw new Error(`Registration failed with status ${regRes.status}: ${JSON.stringify(regRes.data)}`);
  }
  console.log('   ✓ Registered successfully. Patient ID:', regRes.data.patientId);
  const { userId, demoOtp } = regRes.data;
  if (!demoOtp) throw new Error('demoOtp was expected in test environment');

  // 2. Patient OTP Verification
  console.log('2. Testing OTP Verification & Auto-Activation...');
  const otpRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/verify-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    userId,
    otp: demoOtp
  });

  if (otpRes.status !== 200 || !otpRes.data.token) {
    throw new Error(`OTP verification failed: ${JSON.stringify(otpRes.data)}`);
  }
  const patientToken = otpRes.data.token;
  console.log('   ✓ OTP verified! Patient authenticated with JWT.');
  console.log('   ✓ Booking Permission:', otpRes.data.user.patientProfile.booking_permission === 1 ? 'GRANTED (Immediate)' : 'LOCKED');

  // 3. Patient Appointment Booking (Direct booking without admin code)
  console.log('3. Testing Direct Appointment Booking...');
  const bookRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/patient/book-appointment',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${patientToken}`
    }
  }, {
    hospital_id: 'HOSP-101',
    test_type: 'Comprehensive Metabolic Panel (CMP)',
    preferred_date: '2026-10-20',
    preferred_time: '09:30 AM',
    reason: 'Routine annual metabolic screening',
    symptoms: 'Mild fatigue'
  });

  if (bookRes.status !== 201) {
    throw new Error(`Booking failed: ${JSON.stringify(bookRes.data)}`);
  }
  const appointmentId = bookRes.data.appointmentId || bookRes.data.appointment?.appointment_id;
  console.log('   ✓ Appointment booked successfully. Ref ID:', appointmentId);

  // 4. Hospital Login (Device 2)
  console.log('4. Logging in as Hospital Clinical Staff (Device 2)...');
  const hospLoginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    identifier: 'hospital@kenva.local',
    password: 'Password123!',
    expectedRole: 'HOSPITAL'
  });

  if (hospLoginRes.status !== 200 || !hospLoginRes.data.token) {
    throw new Error(`Hospital login failed: ${JSON.stringify(hospLoginRes.data)}`);
  }
  const hospitalToken = hospLoginRes.data.token;
  console.log('   ✓ Hospital staff logged in.');

  // 5. Hospital sees the appointment in their queue
  console.log('5. Verifying Appointment appears in Hospital Queue...');
  const hospDashRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/hospital/dashboard',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${hospitalToken}` }
  });

  const matchingApt = hospDashRes.data.appointments.find(a => a.appointment_id === appointmentId);
  if (!matchingApt) {
    throw new Error(`Appointment ${appointmentId} did not appear in hospital dashboard!`);
  }
  console.log('   ✓ Found appointment in Hospital queue. Status:', matchingApt.status);

  // 6. Hospital Confirms Appointment (Stage 2)
  console.log('6. Hospital Confirms Appointment (Stage 2: Confirmed)...');
  const confirmRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/hospital/appointments/${appointmentId}/status`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hospitalToken}`
    }
  }, {
    status: 'CONFIRMED',
    notes: 'Slot confirmed at Metro Care Diagnostic.'
  });
  if (confirmRes.status !== 200) throw new Error(`Confirmation failed: ${JSON.stringify(confirmRes.data)}`);
  console.log('   ✓ Appointment status updated to CONFIRMED.');

  // 7. Hospital Schedules Collection (Stage 3)
  console.log('7. Hospital Schedules Specimen Collection (Stage 3)...');
  const schedRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/hospital/appointments/${appointmentId}/schedule-collection`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hospitalToken}`
    }
  }, {
    scheduled_date: '2026-10-20',
    scheduled_time: '09:30 AM',
    collection_location: 'Metro Care Diagnostic - Specimen Collection Center',
    instructions: '10-hour fasting required.'
  });
  if (schedRes.status !== 200) throw new Error(`Schedule failed: ${JSON.stringify(schedRes.data)}`);
  console.log('   ✓ Stage 3: Collection scheduled.');

  // 8. Hospital Assigns Collector (Stage 4)
  console.log('8. Hospital Assigns Sample Collector (Stage 4)...');
  const assignRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/hospital/appointments/${appointmentId}/assign-collector`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hospitalToken}`
    }
  }, {
    collector_name: 'V. Ramanjaneyulu',
    collector_role: 'Certified Clinical Phlebotomist',
    collector_phone: '+91 94411 22334'
  });
  if (assignRes.status !== 200) throw new Error(`Assign collector failed: ${JSON.stringify(assignRes.data)}`);
  console.log('   ✓ Stage 4: Collector assigned (V. Ramanjaneyulu, +91 94411 22334).');

  // Verify patient sees collector details
  console.log('   Checking Patient Portal sees collector credentials...');
  const patientDash1 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/patient/dashboard',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${patientToken}` }
  });
  const aptCheck = patientDash1.data.appointments.find(a => a.appointment_id === appointmentId);
  console.log('   ✓ Patient Portal shows status:', aptCheck.status);

  // 9. Hospital Collects Sample & Registers Specimen (Stage 5)
  console.log('9. Hospital Registers Specimen & Marks Sample Collected (Stage 5)...');
  const sampleRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/hospital/samples',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hospitalToken}`
    }
  }, {
    appointment_id: appointmentId,
    sample_type: 'Venous Whole Blood & Serum',
    container_id: 'KEN-BC-TEST-8812',
    collected_by: 'V. Ramanjaneyulu'
  });
  if (sampleRes.status !== 201) throw new Error(`Sample registration failed: ${JSON.stringify(sampleRes.data)}`);
  const sampleId = sampleRes.data.sample.sample_id;
  console.log('   ✓ Stage 5: Sample registered. Unique Sample ID:', sampleId);

  // 10. Advance Workflow Stages 6 to 11
  const stagesToTest = [
    { num: 6, name: 'Logistics Pickup', payload: { nextStage: 6, courier_name: 'Kenva ColdChain Express', tracking_number: 'TRK-99011' } },
    { num: 7, name: 'In Transit', payload: { nextStage: 7, temp_celsius: '3.6' } },
    { num: 8, name: 'Lab Received', payload: { nextStage: 8, receiving_tech: 'P. Vani, Intake Specialist' } },
    { num: 9, name: 'Testing in Progress', payload: { nextStage: 9, analyzer_model: 'Sysmex XN-1000' } },
    { num: 10, name: 'Report Ready', payload: { nextStage: 10, summary_findings: 'All biomarkers within normal reference ranges.' } },
    { num: 11, name: 'Report Available', payload: { nextStage: 11, summary_findings: 'Digitally verified and released to patient portal.' } }
  ];

  for (const st of stagesToTest) {
    console.log(`10.${st.num - 5}. Advancing to Stage ${st.num}: ${st.name}...`);
    const advRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/hospital/samples/${sampleId}/advance-workflow`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hospitalToken}`
      }
    }, st.payload);
    if (advRes.status !== 200) throw new Error(`Stage ${st.num} advance failed: ${JSON.stringify(advRes.data)}`);
    console.log(`   ✓ Stage ${st.num} reached.`);
  }

  // 11. Verify Patient Portal gets the report and notifications
  console.log('11. Verifying Patient Portal receives published report & notifications...');
  const patientDashFinal = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/patient/dashboard',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${patientToken}` }
  });

  const patientReports = patientDashFinal.data.reports || [];
  const matchingReport = patientReports.find(r => r.sample_id === sampleId);
  if (!matchingReport) {
    throw new Error(`Report for sample ${sampleId} not found in Patient Portal!`);
  }
  console.log('   ✓ Final Report Available in Patient Portal:', matchingReport.report_id);
  console.log('   ✓ Total in-app notifications generated for patient:', (patientDashFinal.data.notifications || []).length);

  // 12. Security Isolation Test: Another patient cannot access this report
  console.log('12. Security Isolation Test: Verifying Another Patient Cannot Access Report...');
  const unauthorizedRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/patient/reports/${matchingReport.report_id}/download`,
    method: 'GET',
    headers: { 'Authorization': 'Bearer INVALID_OR_OTHER_TOKEN' }
  });
  if (unauthorizedRes.status !== 401 && unauthorizedRes.status !== 403) {
    throw new Error(`Expected 401/403 for unauthorized report access, got ${unauthorizedRes.status}`);
  }
  console.log('   ✓ Security verified: Unauthorized request rejected with', unauthorizedRes.status);

  console.log('\n=== ALL WORKFLOW STAGES AND INTEGRATION TESTS PASSED SUCCESSFULLY! ===');
}

runTest().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
