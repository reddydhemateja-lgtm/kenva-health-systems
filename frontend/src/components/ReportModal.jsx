import React from 'react';
import { X, Download, ShieldCheck, Printer, FileText, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';

export default function ReportModal({ report, patient, hospital, isOpen, onClose }) {
  if (!isOpen || !report) return null;

  let results = [];
  try {
    results = typeof report.detailed_results_json === 'string'
      ? JSON.parse(report.detailed_results_json)
      : (report.detailed_results_json || []);
  } catch (err) {
    console.error('Error parsing report results:', err);
  }

  const downloadPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(15, 23, 42); // Navy
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(45, 212, 191); // Teal
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('KENVA HEALTH SYSTEMS', 14, 20);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL DIAGNOSTIC LABORATORY REPORT', 14, 28);
    doc.text(`Report ID: ${report.report_id}`, 140, 20);
    doc.text(`Date: ${new Date(report.created_at).toLocaleDateString()}`, 140, 28);

    // Patient & Hospital Details Box
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 48, 182, 36, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Information', 18, 56);
    doc.text('Facility & Order Info', 110, 56);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${patient?.name || 'Jonathan Miller'}`, 18, 63);
    doc.text(`Patient ID: ${report.patient_id}`, 18, 70);
    doc.text(`DOB / City: ${patient?.dob || '1988-06-15'} (${patient?.city || 'New York'})`, 18, 77);

    doc.text(`Hospital: ${hospital?.name || 'Metro Central Diagnostic Institute'}`, 110, 63);
    doc.text(`Order ID: ${report.order_id}`, 110, 70);
    doc.text(`Pathologist: ${report.pathologist_name}`, 110, 77);

    // Findings
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Findings & Summary', 14, 94);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const splitFindings = doc.splitTextToSize(report.summary_findings, 182);
    doc.text(splitFindings, 14, 101);

    // Results Table
    let y = 118;
    doc.setFillColor(13, 148, 136);
    doc.rect(14, y, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('TEST PARAMETER', 18, y + 5.5);
    doc.text('RESULT', 95, y + 5.5);
    doc.text('REFERENCE RANGE', 135, y + 5.5);
    doc.text('STATUS', 175, y + 5.5);

    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    results.forEach((row, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, 182, 7, 'F');
      }
      doc.text(String(row.parameter || ''), 18, y + 5);
      doc.text(String(row.value || ''), 95, y + 5);
      doc.text(String(row.reference || ''), 135, y + 5);
      doc.text(String(row.status || 'NORMAL'), 175, y + 5);
      y += 7;
    });

    // Signature Footer
    y += 15;
    doc.setDrawColor(203, 213, 225);
    doc.line(14, y, 196, y);
    y += 8;

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Electronically signed by ${report.pathologist_name}`, 14, y);
    doc.text(`Digital Verification Hash: ${report.signature_hash || 'SHA256-KENVA-VERIFIED'}`, 14, y + 5);
    doc.text('All test results verified against CLIA quality control standards. Fictional prototype document.', 14, y + 10);

    doc.save(`${report.report_id}_Kenva_Diagnostic_Report.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-teal-500/30 shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-lg text-white">{report.report_title}</h3>
                <span className="badge badge-approved"><CheckCircle2 className="w-3 h-3" /> Final Verified</span>
              </div>
              <p className="text-xs text-slate-400">
                Report ID: <span className="font-mono text-teal-400">{report.report_id}</span> • Order: <span className="font-mono text-slate-300">{report.order_id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadPDF}
              className="btn-teal text-xs py-2 px-3.5"
            >
              <Download className="w-4 h-4" /> Download Signed PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Content Scroll Area */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-200">
          
          {/* Patient & Hospital Header Card */}
          <div className="glass-card p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border border-slate-700/60">
            <div>
              <h5 className="font-bold text-teal-400 uppercase tracking-wider mb-2">Patient Details</h5>
              <p className="text-slate-200 font-semibold text-sm">{patient?.name || 'Jonathan Miller'}</p>
              <p className="text-slate-400">Patient ID: <span className="font-mono text-slate-200">{report.patient_id}</span></p>
              <p className="text-slate-400">Date of Birth: {patient?.dob || '1988-06-15'}</p>
              <p className="text-slate-400">Location: {patient?.city || 'New York'}</p>
            </div>

            <div>
              <h5 className="font-bold text-teal-400 uppercase tracking-wider mb-2">Diagnostic Facility</h5>
              <p className="text-slate-200 font-semibold text-sm">{hospital?.name || 'Metro Central Diagnostic Institute'}</p>
              <p className="text-slate-400">Pathologist: {report.pathologist_name}</p>
              <p className="text-slate-400">Issued On: {new Date(report.created_at).toLocaleString()}</p>
              <p className="text-slate-400">Verification Hash: <span className="font-mono text-teal-300">{report.signature_hash}</span></p>
            </div>
          </div>

          {/* Clinical Findings Summary */}
          <div>
            <h5 className="font-heading font-bold text-sm text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" /> Pathologist Clinical Summary
            </h5>
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs leading-relaxed text-slate-300">
              {report.summary_findings}
            </div>
          </div>

          {/* Results Table */}
          <div>
            <h5 className="font-heading font-bold text-sm text-white uppercase tracking-wider mb-3">
              Biomarker Diagnostic Test Results
            </h5>
            
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-300 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Test Parameter</th>
                    <th className="p-3">Measured Value</th>
                    <th className="p-3">Reference Range</th>
                    <th className="p-3">Interpretation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/50">
                  {results.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="p-3 font-semibold text-white">{r.parameter}</td>
                      <td className="p-3 font-mono font-bold text-teal-400">{r.value}</td>
                      <td className="p-3 text-slate-400 font-mono">{r.reference}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === 'NORMAL' || r.status === 'OPTIMAL'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Electronic Signature Box */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold text-white">{report.pathologist_name}</div>
                <div className="text-[11px] text-teal-400 font-mono">Digital Signature Hash: {report.signature_hash}</div>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-500">
              Verified by Kenva Health Network • CLIA Certified Fictional Result
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
