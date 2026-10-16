import React from 'react';
import { Shield, Lock, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function PrivacyPolicyPage({ setActiveTab }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button
        onClick={() => setActiveTab('landing')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-teal-400 hover:text-teal-300 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="glass-panel p-8 sm:p-12 rounded-2xl border border-slate-700 bg-slate-900/90 space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-teal-500/10 text-teal-400 text-xs font-mono uppercase mb-3">
            <Shield className="w-3.5 h-3.5" /> Legal & Compliance
          </div>
          <h1 className="text-3xl font-heading font-bold text-white">Privacy Policy</h1>
          <p className="text-xs text-slate-400 mt-2">Effective Date: October 16, 2026 | Kenva Health Systems Inc.</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-teal-400" /> 1. Commitment to Health Data Privacy
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Kenva Health Systems ("Kenva", "we", "our", or "us") provides a unified clinical diagnostic and specimen tracking platform connecting patients, partner hospital collection centers, and accredited reference laboratories. We handle sensitive personal data and electronic protected health information (ePHI) with strict adherence to applicable digital health data protection standards and healthcare privacy regulations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-400" /> 2. Information We Collect
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            To provide accurate clinical coordination and diagnostic reporting, we collect the following categories of information:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300 pl-4 list-disc">
            <li><strong>Patient Demographic Information:</strong> Full name, date of birth, contact telephone number, residential city, and verified email address.</li>
            <li><strong>Clinical Identifiers:</strong> System-assigned Patient IDs (e.g., KEN-P-1001), appointment timestamps, and assigned healthcare facility.</li>
            <li><strong>Diagnostic Specimen & Test Data:</strong> Requisition order details, laboratory barcodes, collection site timestamps, cold-chain temperature telemetry, and authorized pathologist diagnostic reports.</li>
            <li><strong>Authentication & Security Data:</strong> Cryptographically hashed passwords, short-lived one-time verification tokens, and immutable audit logs.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400" /> 3. How We Use Clinical Information
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            We use collected data strictly for healthcare operations and diagnostic delivery:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300 pl-4 list-disc">
            <li>Verifying patient identity prior to specimen collection and lab intake.</li>
            <li>Maintaining cold-chain custody and barcode traceability across transit stages.</li>
            <li>Generating and delivering cryptographically signed PDF diagnostic reports to authorized patients.</li>
            <li>Facilitating clinical communication between referring physicians and accredited laboratories.</li>
            <li>Maintaining immutable audit logs for regulatory accountability. We never sell or monetize health data.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-teal-400" /> 4. Data Storage & Security Controls
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            All records in Kenva Health Systems are protected using industry-standard technical safeguards:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300 pl-4 list-disc">
            <li><strong>Encryption in Transit:</strong> TLS 1.3 encryption across all client-to-server and inter-service communications.</li>
            <li><strong>Role-Based Access Control (RBAC):</strong> Strict cryptographic authorization barriers between patients, clinical hospital staff, and system administrators.</li>
            <li><strong>Data Integrity:</strong> SHA-256 hash validation for final diagnostic reports and deterministic audit trail logging.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-400" /> 5. Patient Rights & Data Access
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Registered patients hold the right to access their complete diagnostic test history, download authorized lab reports, request corrections to demographic records, or inquire about data retention policies by contacting our clinical data protection officer.
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-800 pt-6">
          <h2 className="text-base font-bold text-white">Contact Our Data Protection Office</h2>
          <p className="text-xs text-slate-400">
            For privacy inquiries or medical record access requests, contact:<br />
            Kenva Health Systems Compliance Office<br />
            100 Kenva Healthcare Plaza, Air Bypass Road, Tirupati, AP 517502<br />
            Email: compliance@kenva.health.local | Phone: +91 877 2255001
          </p>
        </section>
      </div>
    </div>
  );
}
