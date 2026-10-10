const bcrypt = require('bcryptjs');
const db = require('./db');

async function seedData() {
  console.log('Seeding database with clean clinical healthcare demonstration data...');

  // Reset database arrays safely
  const collections = [
    'users', 'patient_profiles', 'hospitals', 'hospital_staff',
    'booking_access_codes', 'appointments', 'test_orders', 'samples',
    'logistics_events', 'laboratory_records', 'reports',
    'sample_workflow_timeline', 'notifications', 'audit_logs'
  ];

  collections.forEach(col => {
    const arr = db.getCollection(col);
    arr.length = 0;
  });

  const now = new Date().toISOString();
  const passHash = await bcrypt.hash('Password123!', 10);
  const adminPassHash = await bcrypt.hash('AdminPassword123!', 10);

  // 1. Hospital Facilities near Tirupati
  const hospital1 = {
    id: 'HOSP-101',
    name: 'Metro Care Diagnostic Center',
    code: 'MCDI',
    city: 'Tirupati, AP',
    address: 'Near MR Palli Circle, Air Bypass Road, Tirupati, AP 517502',
    contact_email: 'clinical@mcdi.kenva.local',
    contact_phone: '+91 877 2255001',
    accreditation: 'NABL & ICMR Accredited Diagnostic Center',
    is_fictional: 0
  };

  const hospital2 = {
    id: 'HOSP-102',
    name: 'Sri Venkateswara Specialty Clinic',
    code: 'SVSC',
    city: 'Tirupati, AP',
    address: 'Opposite SVIMS Hospital Main Gate, Alipiri Road, Tirupati, AP 517507',
    contact_email: 'info@svsc.kenva.local',
    contact_phone: '+91 877 2288002',
    accreditation: 'ISO 15189 Certified Medical Laboratory',
    is_fictional: 0
  };

  const hospital3 = {
    id: 'HOSP-103',
    name: 'Apex Diagnostic Center',
    code: 'APEX',
    city: 'Tirupati, AP',
    address: 'Near MR Palli, Renigunta Road, Tirupati, AP 517501',
    contact_email: 'pathology@apex.kenva.local',
    contact_phone: '+91 877 2244003',
    accreditation: 'NABH Accredited Diagnostic Center',
    is_fictional: 0
  };

  db.insert('hospitals', hospital1);
  db.insert('hospitals', hospital2);
  db.insert('hospitals', hospital3);

  // 2. Users
  // Admin User: Kenva Health Systems Admin
  const adminUser = {
    id: 'USR-ADMIN-01',
    email: 'admin@kenva.local',
    password: adminPassHash,
    role: 'ADMIN',
    name: 'Kenva Health Systems Admin',
    phone: '+91 94400 11223',
    created_at: now
  };
  db.insert('users', adminUser);

  // Hospital Staff User: Metro Care Hospital Staff
  const hospitalStaffUser = {
    id: 'USR-STAFF-01',
    email: 'hospital@kenva.local',
    password: passHash,
    role: 'HOSPITAL',
    name: 'Metro Care Hospital Staff',
    phone: '+91 98480 22334',
    created_at: now
  };
  db.insert('users', hospitalStaffUser);

  db.insert('hospital_staff', {
    id: 'HS-01',
    user_id: 'USR-STAFF-01',
    hospital_id: 'HOSP-101',
    department: 'Clinical Pathology & Specimen Intake',
    role_title: 'Senior Specimen Technician'
  });

  // Approved Patient User: Kalyan Varma
  const approvedPatientUser = {
    id: 'USR-PAT-01',
    email: 'patient@kenva.local',
    password: passHash,
    role: 'PATIENT',
    name: 'Kalyan Varma',
    phone: '+91 98765 43210',
    created_at: now
  };
  db.insert('users', approvedPatientUser);

  const approvedPatientProfile = {
    patient_id: 'KEN-P-1001',
    user_id: 'USR-PAT-01',
    dob: '1992-06-15',
    city: 'Tirupati',
    approval_status: 'APPROVED',
    booking_permission: 1, // Activated!
    approved_at: now,
    rejection_reason: null
  };
  db.insert('patient_profiles', approvedPatientProfile);

  // Code for approved patient
  db.insert('booking_access_codes', {
    id: 'BC-1001',
    code: 'KEN-CODE-8921-X7',
    patient_id: 'KEN-P-1001',
    generated_by: 'USR-ADMIN-01',
    is_redeemed: 1,
    redeemed_at: now,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: now
  });

  // Pending Patient User: Ananya Rao
  const pendingPatientUser = {
    id: 'USR-PAT-02',
    email: 'pending.patient@kenva.local',
    password: passHash,
    role: 'PATIENT',
    name: 'Ananya Rao',
    phone: '+91 91234 56789',
    created_at: now
  };
  db.insert('users', pendingPatientUser);

  const pendingPatientProfile = {
    patient_id: 'KEN-P-1002',
    user_id: 'USR-PAT-02',
    dob: '1997-09-20',
    city: 'Tirupati',
    approval_status: 'PENDING_APPROVAL',
    booking_permission: 0,
    approved_at: null,
    rejection_reason: null
  };
  db.insert('patient_profiles', pendingPatientProfile);

  // 3. Appointments
  const apt1 = {
    appointment_id: 'APT-2026-8812',
    patient_id: 'KEN-P-1001',
    hospital_id: 'HOSP-101',
    preferred_date: '2026-10-14',
    preferred_time: '09:30 AM',
    reason: 'Annual Comprehensive Metabolic & Diabetes Screening',
    symptoms: 'Routine health checkup.',
    status: 'CONFIRMED',
    notes: 'Fast 10-12 hours prior to venous blood draw.',
    created_at: now,
    updated_at: now
  };

  const apt2 = {
    appointment_id: 'APT-2026-9044',
    patient_id: 'KEN-P-1001',
    hospital_id: 'HOSP-103',
    preferred_date: '2026-10-20',
    preferred_time: '02:00 PM',
    reason: 'Follow-up Diagnostic Thyroid Panel',
    symptoms: 'Mild seasonal symptoms.',
    status: 'PENDING_CONFIRMATION',
    notes: 'Awaiting scheduling confirmation from hospital intake.',
    created_at: now,
    updated_at: now
  };

  db.insert('appointments', apt1);
  db.insert('appointments', apt2);

  // 4. Test Orders
  const order1 = {
    order_id: 'ORD-9021',
    appointment_id: 'APT-2026-8812',
    patient_id: 'KEN-P-1001',
    hospital_id: 'HOSP-101',
    test_type: 'Comprehensive Metabolic & Lipid Panel (CMP + HbA1c)',
    ordering_physician: 'Dr. R. K. Prasad, MD',
    urgency: 'ROUTINE',
    status: 'REPORT_AVAILABLE',
    notes: 'Standard diagnostic wellness panel.',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  };

  const order2 = {
    order_id: 'ORD-9088',
    appointment_id: null,
    patient_id: 'KEN-P-1001',
    hospital_id: 'HOSP-101',
    test_type: 'Thyroid Profile & Vitamin D3 Screen',
    ordering_physician: 'Dr. S. K. Ramesh, MD',
    urgency: 'URGENT',
    status: 'TESTING_IN_PROGRESS',
    notes: 'Targeted endocrinology screen.',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  };

  db.insert('test_orders', order1);
  db.insert('test_orders', order2);

  // 5. Samples & 10-Step Journeys
  const sample1 = {
    sample_id: 'SMP-77412',
    order_id: 'ORD-9021',
    patient_id: 'KEN-P-1001',
    hospital_id: 'HOSP-101',
    sample_type: 'Venous Whole Blood & Serum',
    container_id: 'CONT-RED-88201',
    collected_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    collected_by: 'Metro Care Phlebotomist',
    current_workflow_stage: 10,
    status_label: 'Report Available',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  };
  db.insert('samples', sample1);

  db.insert('logistics_events', {
    id: 'LOG-5001',
    sample_id: 'SMP-77412',
    courier_name: 'Kenva ColdChain Logistics (Tirupati Hub)',
    tracking_number: 'TRACK-KVA-981244',
    pickup_time: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    origin_facility: hospital1.name,
    destination_lab: 'Kenva Central Reference Laboratory #1 (Tirupati)',
    temperature_celsius: 3.8,
    current_status: 'DELIVERED',
    updated_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString()
  });

  db.insert('laboratory_records', {
    id: 'LABREC-8001',
    sample_id: 'SMP-77412',
    lab_name: 'Kenva Central Reference Laboratory #1 (Tirupati)',
    technician_name: 'Dr. K. Saroja, MD (Chief Pathologist)',
    received_at: new Date(Date.now() - 35 * 3600 * 1000).toISOString(),
    testing_started_at: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    testing_completed_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    test_results_json: JSON.stringify([
      { parameter: 'Fasting Plasma Glucose', value: '94 mg/dL', reference: '70 - 99 mg/dL', status: 'NORMAL' },
      { parameter: 'HbA1c', value: '5.4 %', reference: '< 5.7 %', status: 'OPTIMAL' },
      { parameter: 'Serum Creatinine', value: '0.9 mg/dL', reference: '0.6 - 1.2 mg/dL', status: 'NORMAL' },
      { parameter: 'Total Cholesterol', value: '182 mg/dL', reference: '< 200 mg/dL', status: 'NORMAL' },
      { parameter: 'Triglycerides', value: '115 mg/dL', reference: '< 150 mg/dL', status: 'NORMAL' },
      { parameter: 'HDL Cholesterol', value: '55 mg/dL', reference: '> 40 mg/dL', status: 'OPTIMAL' },
      { parameter: 'LDL Cholesterol', value: '104 mg/dL', reference: '< 100 mg/dL', status: 'SLIGHTLY_ELEVATED' }
    ]),
    lab_notes: 'Specimen cold chain maintained at 3.8°C throughout transit from MR Palli center. All quality calibration benchmarks satisfied.'
  });

  const stagesInfo = [
    { num: 1, name: 'Test Order Created', actor: 'Dr. R. K. Prasad, MD', role: 'Physician', loc: hospital1.name, offsetHours: 72 },
    { num: 2, name: 'Patient Registration Verified', actor: 'Kalyan Varma', role: 'Patient', loc: hospital1.name, offsetHours: 70 },
    { num: 3, name: 'Sample Collection', actor: 'Metro Care Phlebotomist', role: 'Phlebotomist', loc: hospital1.name, offsetHours: 48 },
    { num: 4, name: 'Sample Registered in LIMS', actor: 'Metro Care Staff', role: 'Specimen Tech', loc: hospital1.name, offsetHours: 46 },
    { num: 5, name: 'Logistics Pickup', actor: 'Express Logistics Staff', role: 'ColdChain Courier', loc: hospital1.name, offsetHours: 40 },
    { num: 6, name: 'In Transit', actor: 'Kenva Logistics Dispatch', role: 'Logistics System', loc: 'Transit Hub Renigunta Road', offsetHours: 38 },
    { num: 7, name: 'Laboratory Received', actor: 'Receiving Tech P. Vani', role: 'Lab Staff', loc: 'Kenva Central Ref Lab (Tirupati)', offsetHours: 35 },
    { num: 8, name: 'Testing in Progress', actor: 'Dr. K. Saroja, MD', role: 'Lead Pathologist', loc: 'Kenva Central Ref Lab (Tirupati)', offsetHours: 30 },
    { num: 9, name: 'Testing Completed', actor: 'Dr. K. Saroja, MD', role: 'Lead Pathologist', loc: 'Kenva Central Ref Lab (Tirupati)', offsetHours: 10 },
    { num: 10, name: 'Report Generated & Available', actor: 'Kenva Automated LIMS', role: 'System', loc: 'Kenva Cloud Portal', offsetHours: 5 }
  ];

  stagesInfo.forEach(st => {
    db.insert('sample_workflow_timeline', {
      id: `TL-SMP-77412-STAGE-${st.num}`,
      sample_id: 'SMP-77412',
      stage_number: st.num,
      stage_name: st.name,
      actor_name: st.actor,
      actor_role: st.role,
      location: st.loc,
      timestamp: new Date(Date.now() - st.offsetHours * 3600 * 1000).toISOString(),
      notes: `Stage ${st.num} completed: ${st.name}`
    });
  });

  db.insert('reports', {
    report_id: 'REP-2026-4491',
    order_id: 'ORD-9021',
    patient_id: 'KEN-P-1001',
    hospital_id: 'HOSP-101',
    report_title: 'Comprehensive Metabolic & Diabetes Diagnostic Report',
    summary_findings: 'Fasting glucose and HbA1c levels are within optimal range (5.4%). Lipid parameters show mild elevation in LDL cholesterol (104 mg/dL). Lifestyle modifications recommended.',
    detailed_results_json: JSON.stringify([
      { parameter: 'Fasting Plasma Glucose', value: '94 mg/dL', reference: '70 - 99 mg/dL', status: 'NORMAL' },
      { parameter: 'HbA1c', value: '5.4 %', reference: '< 5.7 %', status: 'OPTIMAL' },
      { parameter: 'Serum Creatinine', value: '0.9 mg/dL', reference: '0.6 - 1.2 mg/dL', status: 'NORMAL' },
      { parameter: 'Total Cholesterol', value: '182 mg/dL', reference: '< 200 mg/dL', status: 'NORMAL' },
      { parameter: 'Triglycerides', value: '115 mg/dL', reference: '< 150 mg/dL', status: 'NORMAL' },
      { parameter: 'HDL Cholesterol', value: '55 mg/dL', reference: '> 40 mg/dL', status: 'OPTIMAL' },
      { parameter: 'LDL Cholesterol', value: '104 mg/dL', reference: '< 100 mg/dL', status: 'SLIGHTLY_ELEVATED' }
    ]),
    pathologist_name: 'Dr. K. Saroja, MD (Chief Clinical Pathologist)',
    signature_hash: 'SHA256-KENVA-998E21',
    is_final: 1,
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
  });

  const sample2 = {
    sample_id: 'SMP-99120',
    order_id: 'ORD-9088',
    patient_id: 'KEN-P-1001',
    hospital_id: 'HOSP-101',
    sample_type: 'Plasma & Serum',
    container_id: 'CONT-GOLD-44109',
    collected_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    collected_by: 'Metro Care Staff',
    current_workflow_stage: 8,
    status_label: 'Testing in Progress',
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  };
  db.insert('samples', sample2);

  const sample2Stages = [
    { num: 1, name: 'Test Order Created', actor: 'Dr. S. K. Ramesh, MD', role: 'Physician', loc: hospital1.name, offsetHours: 24 },
    { num: 2, name: 'Patient Registration Verified', actor: 'Kalyan Varma', role: 'Patient', loc: hospital1.name, offsetHours: 20 },
    { num: 3, name: 'Sample Collection', actor: 'Metro Care Staff', role: 'Phlebotomist', loc: hospital1.name, offsetHours: 12 },
    { num: 4, name: 'Sample Registered in LIMS', actor: 'Metro Care Staff', role: 'Specimen Tech', loc: hospital1.name, offsetHours: 11 },
    { num: 5, name: 'Logistics Pickup', actor: 'Express Logistics Staff', role: 'ColdChain Courier', loc: hospital1.name, offsetHours: 8 },
    { num: 6, name: 'In Transit', actor: 'Kenva Logistics Dispatch', role: 'Logistics System', loc: 'En Route to Lab', offsetHours: 6 },
    { num: 7, name: 'Laboratory Received', actor: 'Receiving Tech P. Vani', role: 'Lab Staff', loc: 'Kenva Central Ref Lab (Tirupati)', offsetHours: 3 },
    { num: 8, name: 'Testing in Progress', actor: 'Dr. K. Saroja, MD', role: 'Endocrinology Specialist', loc: 'Kenva Central Ref Lab (Tirupati)', offsetHours: 1 }
  ];

  sample2Stages.forEach(st => {
    db.insert('sample_workflow_timeline', {
      id: `TL-SMP-99120-STAGE-${st.num}`,
      sample_id: 'SMP-99120',
      stage_number: st.num,
      stage_name: st.name,
      actor_name: st.actor,
      actor_role: st.role,
      location: st.loc,
      timestamp: new Date(Date.now() - st.offsetHours * 3600 * 1000).toISOString(),
      notes: `Stage ${st.num}: ${st.name}`
    });
  });

  db.notifyUser({
    user_id: approvedPatientUser.id,
    title: 'Diagnostic Report Available',
    message: 'Your report for Order #ORD-9021 is ready for viewing and download.',
    type: 'REPORT_AVAILABLE'
  });

  db.notifyUser({
    user_id: approvedPatientUser.id,
    title: 'Booking Access Code Redeemed',
    message: 'Your code KEN-CODE-8921-X7 was verified. Full appointment scheduling is unlocked.',
    type: 'BOOKING_CODE_REDEEMED'
  });

  db.notifyUser({
    user_id: pendingPatientUser.id,
    title: 'Account Registration Received',
    message: 'Your registration is awaiting administrator approval. You will receive a booking access code after approval.',
    type: 'ACCOUNT_REGISTRATION'
  });

  db.logAudit({
    actor_id: adminUser.id,
    actor_name: adminUser.name,
    actor_role: 'ADMIN',
    action: 'INITIALIZE_SYSTEM_SEED',
    target_type: 'SYSTEM',
    target_id: 'KENVA_CORE',
    details: 'Database initialized with clean clinical demonstration dataset.'
  });

  console.log('Database seeded successfully!');
  console.log('--- ACCOUNTS ---');
  console.log('1. Patient (Approved): patient@kenva.local / Password123! (Name: Kalyan Varma, ID: KEN-P-1001)');
  console.log('2. Patient (Pending Approval): pending.patient@kenva.local / Password123! (Name: Ananya Rao, ID: KEN-P-1002)');
  console.log('3. Hospital Staff: hospital@kenva.local / Password123! (Name: Metro Care Hospital Staff)');
  console.log('4. Administrator: admin@kenva.local / AdminPassword123! (Name: Kenva Health Systems Admin)');
}

seedData().catch(console.error);
