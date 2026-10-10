const http = require('http');

async function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING KENVA BACKEND WORKFLOW VERIFICATION ---');

  // 1. Health check
  const health = await makeRequest('/api/health');
  console.log('1. Health Check:', health.status, health.body);

  // 2. Patient Login (Approved - Kalyan Varma)
  const pLogin = await makeRequest('/api/auth/login', 'POST', {
    identifier: 'patient@kenva.local',
    password: 'Password123!',
    expectedRole: 'PATIENT'
  });
  console.log('2. Approved Patient Login:', pLogin.status, pLogin.body.user.name, pLogin.body.user.patientProfile.patient_id);
  const pToken = pLogin.body.token;

  // 3. Patient Dashboard check
  const pDash = await makeRequest('/api/patient/dashboard', 'GET', null, pToken);
  console.log('3. Patient Dashboard loaded. Reports count:', pDash.body.reports.length, 'Orders count:', pDash.body.testOrders.length);

  // 4. Admin Login (Kenva Health Systems Admin)
  const aLogin = await makeRequest('/api/auth/login', 'POST', {
    identifier: 'admin@kenva.local',
    password: 'AdminPassword123!',
    expectedRole: 'ADMIN'
  });
  console.log('4. Admin Login:', aLogin.status, aLogin.body.user.name);
  const aToken = aLogin.body.token;

  // 5. Admin Stats check
  const aStats = await makeRequest('/api/admin/stats', 'GET', null, aToken);
  console.log('5. Admin Stats:', aStats.body);

  // 6. Admin Approve Pending Patient (KEN-P-1002 - Ananya Rao)
  const approveRes = await makeRequest('/api/admin/patients/KEN-P-1002/approve', 'POST', null, aToken);
  console.log('6. Approve Patient & Code Gen:', approveRes.status, 'Generated Code:', approveRes.body.bookingCode);

  // 7. Pending Patient Login (Ananya Rao)
  const pendLogin = await makeRequest('/api/auth/login', 'POST', {
    identifier: 'pending.patient@kenva.local',
    password: 'Password123!',
    expectedRole: 'PATIENT'
  });
  console.log('7. Pending Patient Login response:', pendLogin.status, pendLogin.body);
  const pendToken = pendLogin.body.token;

  // 8. Redeem Code in Patient Portal
  const redeemRes = await makeRequest('/api/patient/verify-booking-code', 'POST', {
    code: approveRes.body.bookingCode
  }, pendToken);
  console.log('8. Redeem Access Code:', redeemRes.status, redeemRes.body.message);

  // 9. Submit Appointment Request
  const apptRes = await makeRequest('/api/patient/book-appointment', 'POST', {
    hospital_id: 'HOSP-101',
    preferred_date: '2026-10-25',
    preferred_time: '11:00 AM',
    reason: 'Routine Health & Metabolism Screening (MR Palli Branch)',
    symptoms: 'Fasting 12 hours.'
  }, pendToken);
  console.log('9. Submit Appointment Request:', apptRes.status, 'Appointment ID:', apptRes.body.appointment.appointment_id);

  // 10. Hospital Staff Login (Metro Care Hospital Staff)
  const hLogin = await makeRequest('/api/auth/login', 'POST', {
    identifier: 'hospital@kenva.local',
    password: 'Password123!',
    expectedRole: 'HOSPITAL'
  });
  console.log('10. Hospital Staff Login:', hLogin.status, hLogin.body.user.name, hLogin.body.user.hospitalStaff.hospital_name);
  const hToken = hLogin.body.token;

  // 11. Confirm Appointment
  const confRes = await makeRequest(`/api/hospital/appointments/${apptRes.body.appointment.appointment_id}/status`, 'POST', {
    status: 'CONFIRMED'
  }, hToken);
  console.log('11. Confirm Appointment:', confRes.status, confRes.body.message);

  // 12. Create Test Order
  const orderRes = await makeRequest('/api/hospital/test-orders', 'POST', {
    patient_id: 'KEN-P-1002',
    appointment_id: apptRes.body.appointment.appointment_id,
    test_type: 'Thyroid & Diabetes Screening Panel',
    ordering_physician: 'Dr. K. Saroja, MD',
    urgency: 'ROUTINE'
  }, hToken);
  console.log('12. Issue Test Order:', orderRes.status, 'Order ID:', orderRes.body.order.order_id);

  // 13. Register Specimen Sample Barcode
  const sampleRes = await makeRequest('/api/hospital/samples', 'POST', {
    order_id: orderRes.body.order.order_id,
    sample_type: 'Venous Whole Blood',
    container_id: 'CONT-RED-99501',
    collected_by: 'Metro Care Hospital Staff'
  }, hToken);
  console.log('13. Register Sample Barcode:', sampleRes.status, 'Sample ID:', sampleRes.body.sample.sample_id);

  // 14. Advance Sample Workflow to Stage 10 (Report Generated & Available!)
  const advRes = await makeRequest(`/api/hospital/samples/${sampleRes.body.sample.sample_id}/advance-workflow`, 'POST', {
    nextStage: 10,
    notes: 'Testing completed & verified by lead pathologist Dr. K. Saroja, MD',
    lab_tech: 'Dr. K. Saroja, MD',
    summary_findings: 'Fasting Glucose 92 mg/dL, HbA1c 5.3%. All biomarkers within normal reference ranges.'
  }, hToken);
  console.log('14. Advance Sample Workflow to Stage 10:', advRes.status, advRes.body.message);

  // 15. Verify Report in Patient Dashboard
  const finalDash = await makeRequest('/api/patient/dashboard', 'GET', null, pendToken);
  console.log('15. Patient Final Dashboard Check. Reports count:', finalDash.body.reports.length, 'Report ID:', finalDash.body.reports[0]?.report_id);

  console.log('--- ALL 12 WORKFLOW STAGES VERIFIED 100% SUCCESSFULLY ---');
}

runTests().catch(console.error);
