import React from 'react';
import { 
  Activity, ShieldCheck, UserCheck, Building2, UserPlus, 
  ArrowRight, FlaskConical, Truck, FileText, CheckCircle2, MapPin, 
  Phone, Mail, Sparkles, Award
} from 'lucide-react';

export default function LandingPage({ setActiveTab, onOpenDemoModal }) {
  
  const handlePortalClick = (tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-24 pb-12">
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 overflow-hidden">
        {/* Glowing Background Orbs */}
        <div className="glow-bg w-96 h-96 bg-teal-500/20 top-10 left-1/4 -translate-x-1/2" />
        <div className="glow-bg w-80 h-80 bg-cyan-500/15 top-32 right-1/4" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-4 h-4" /> Clinical Diagnostics & Specimen Logistics Network
          </div>

          <h1 className="font-heading font-extrabold text-4xl sm:text-6xl lg:text-7xl tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Integrated Specimen Logistics <br />
            <span className="text-teal-400">
              for Clinical Networks
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Kenva Health Systems connects patients, collection facilities, cold-chain transport, and central laboratories into a verified, real-time diagnostic sample tracking system.
          </p>

          {/* 4 Main Action Portals Grid */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            
            {/* 1. Register / Book Appointment */}
            <div 
              onClick={() => handlePortalClick('register')}
              className="glass-card p-6 cursor-pointer hover:border-teal-400/60 hover:bg-teal-500/10 transition-all text-left group relative overflow-hidden bg-slate-800/90 border border-slate-700/80 shadow-xl"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-teal-500/30">
                <UserPlus className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-xl text-white group-hover:text-teal-400 transition-colors">
                1. Register / Book
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                New patients register to receive a unique Patient ID and request access code approval.
              </p>
              <div className="mt-4 flex items-center text-xs font-bold text-teal-400 group-hover:translate-x-1 transition-transform">
                Start Registration <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            {/* 2. Patient Login */}
            <div 
              onClick={() => handlePortalClick('login')}
              className="glass-card p-6 cursor-pointer hover:border-cyan-400/60 hover:bg-cyan-500/10 transition-all text-left group relative overflow-hidden bg-slate-800/90 border border-slate-700/80 shadow-xl"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-cyan-500/30">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-xl text-white group-hover:text-cyan-400 transition-colors">
                2. Patient Login
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Access your patient dashboard, redeem booking code, track sample timeline & view reports.
              </p>
              <div className="mt-4 flex items-center text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
                Patient Portal <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            {/* 3. Hospital Login */}
            <div 
              onClick={() => handlePortalClick('login')}
              className="glass-card p-6 cursor-pointer hover:border-amber-400/60 hover:bg-amber-500/10 transition-all text-left group relative overflow-hidden bg-slate-800/90 border border-slate-700/80 shadow-xl"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-amber-500/30">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-xl text-white group-hover:text-amber-400 transition-colors">
                3. Hospital Staff
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Manage appointments, create test orders, barcode samples, and advance 10-step workflows.
              </p>
              <div className="mt-4 flex items-center text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                Hospital Portal <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            {/* 4. Admin Login */}
            <div 
              onClick={() => handlePortalClick('login')}
              className="glass-card p-6 cursor-pointer hover:border-teal-400/60 hover:bg-slate-700/40 transition-all text-left group relative overflow-hidden bg-slate-800/90 border border-slate-700/80 shadow-xl"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-700/60 text-teal-300 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-slate-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-xl text-white group-hover:text-teal-300 transition-colors">
                4. Admin Login
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Review registrations, generate booking access codes, monitor 10 KPIs, and manage passwords.
              </p>
              <div className="mt-4 flex items-center text-xs font-bold text-teal-300 group-hover:translate-x-1 transition-transform">
                Admin Control <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>

          </div>

          <div className="mt-8">
            <button
              onClick={onOpenDemoModal}
              className="btn-teal text-sm py-3 px-8 shadow-xl cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Quick Access Portals
            </button>
          </div>

        </div>
      </section>

      {/* About Kenva Section */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-slate-700/80 relative overflow-hidden bg-[#111d38]/90">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <div className="space-y-6">
              <span className="badge badge-info text-xs">About Kenva Health Systems</span>
              <h2 className="font-heading font-bold text-3xl sm:text-4xl text-white">
                Eliminating Diagnostic Delays Through Closed-Loop Sample Coordination
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Kenva Health Systems is designed from the ground up to solve sample misplacement, cold-chain temperature breaches, and report delays across multi-facility health networks.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="glass-card p-4 bg-slate-800/80">
                  <div className="font-bold text-teal-400 text-2xl font-heading">100%</div>
                  <div className="text-xs font-semibold text-white mt-1">Sample Traceability</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">End-to-end barcoded LIMS tracking</div>
                </div>

                <div className="glass-card p-4 bg-slate-800/80">
                  <div className="font-bold text-cyan-400 text-2xl font-heading">&lt; 4.0°C</div>
                  <div className="text-xs font-semibold text-white mt-1">Cold-Chain Monitoring</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">Real-time temperature telemetry</div>
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-slate-950/70 p-6 rounded-2xl border border-slate-800">
              <h4 className="font-bold text-white text-base flex items-center gap-2">
                <Award className="w-5 h-5 text-teal-400" /> Platform Security & Verification Standards
              </h4>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span><strong>Role-Based Access Control (RBAC):</strong> Strict cryptographic isolation between Patients, Hospital Staff, and System Admins.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span><strong>Two-Phase Patient Onboarding:</strong> Patient accounts require explicit administrator verification before booking permissions are activated via one-time booking access codes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span><strong>Digitally Signed Reports:</strong> Pathologists sign diagnostic reports with cryptographic hash verification to ensure data integrity.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* 10-Step Healthcare Sample Workflow Overview */}
      <section id="workflow" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="badge badge-approved text-xs">End-to-End Workflow</span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-white mt-3">
            The 10-Step Kenva Diagnostic Sample Journey
          </h2>
          <p className="text-slate-300 text-sm mt-2">
            Every specimen collected in the Kenva network progresses through 10 deterministic, audited stages from initial order placement to final PDF report distribution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { step: 1, title: '1. Test Order', desc: 'Physician issues diagnostic requisition', icon: FileText },
            { step: 2, title: '2. Patient Verification', desc: 'Patient identity verified at facility', icon: UserCheck },
            { step: 3, title: '3. Sample Collection', desc: 'Phlebotomist draws barcoded specimen', icon: FlaskConical },
            { step: 4, title: '4. Sample Registration', desc: 'LIMS logs container barcode', icon: CheckCircle2 },
            { step: 5, title: '5. Logistics Pickup', desc: 'ColdChain courier dispatches sample', icon: Truck },
            { step: 6, title: '6. In Transit', desc: 'Real-time temperature telemetry', icon: Truck },
            { step: 7, title: '7. Lab Received', desc: 'Central lab intake inspection', icon: FlaskConical },
            { step: 8, title: '8. Testing Progress', desc: 'Biomarker assay & processing', icon: Activity },
            { step: 9, title: '9. Testing Completed', desc: 'Pathologist review & quality check', icon: CheckCircle2 },
            { step: 10, title: '10. Report Available', desc: 'Signed PDF delivered to patient', icon: FileText }
          ].map((st) => (
            <div key={st.step} className="glass-card p-4 rounded-xl border border-slate-700 bg-slate-800/90 text-left relative group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                  Step {st.step}
                </span>
                <st.icon className="w-4 h-4 text-slate-400 group-hover:text-teal-400 transition-colors" />
              </div>
              <h4 className="font-bold text-white text-sm">{st.title}</h4>
              <p className="text-xs text-slate-300 mt-1">{st.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Partner Hospital Facilities (Tirupati Region) */}
      <section id="hospitals" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="badge badge-info text-xs">Diagnostic Network</span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-white mt-3">
            Partner Clinical Facilities (Tirupati Region)
          </h2>
          <p className="text-slate-300 text-sm mt-2">
            Kenva Health Systems integrates with accredited hospital laboratories and specialized phlebotomy collection centers across AP.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Facility 1 */}
          <div className="glass-card p-6 border border-slate-700 bg-slate-800/90">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold font-mono text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded">
                MCDI • Tirupati
              </span>
              <Building2 className="w-5 h-5 text-teal-400" />
            </div>
            <h3 className="font-heading font-bold text-lg text-white">
              Metro Care Diagnostic Center
            </h3>
            <p className="text-xs text-slate-300 mt-2 flex items-start gap-1.5">
              <MapPin className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span>Near MR Palli Circle, Air Bypass Road, Tirupati, AP 517502</span>
            </p>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>+91 877 2255001</span>
            </p>
            <div className="mt-4 pt-4 border-t border-slate-700 text-[11px] text-teal-300 font-medium">
              NABL & ICMR Accredited Facility
            </div>
          </div>

          {/* Facility 2 */}
          <div className="glass-card p-6 border border-slate-700 bg-slate-800/90">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded">
                SVSC • Tirupati
              </span>
              <Building2 className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="font-heading font-bold text-lg text-white">
              Sri Venkateswara Specialty Clinic
            </h3>
            <p className="text-xs text-slate-300 mt-2 flex items-start gap-1.5">
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>Opposite SVIMS Main Gate, Alipiri Road, Tirupati, AP 517507</span>
            </p>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>+91 877 2288002</span>
            </p>
            <div className="mt-4 pt-4 border-t border-slate-700 text-[11px] text-cyan-300 font-medium">
              ISO 15189 Certified Medical Laboratory
            </div>
          </div>

          {/* Facility 3 */}
          <div className="glass-card p-6 border border-slate-700 bg-slate-800/90">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded">
                APEX • Tirupati
              </span>
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="font-heading font-bold text-lg text-white">
              Apex Diagnostic Center
            </h3>
            <p className="text-xs text-slate-300 mt-2 flex items-start gap-1.5">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Near MR Palli, Renigunta Road, Tirupati, AP 517501</span>
            </p>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>+91 877 2244003</span>
            </p>
            <div className="mt-4 pt-4 border-t border-slate-700 text-[11px] text-amber-300 font-medium">
              NABH Accredited Diagnostic Center
            </div>
          </div>

        </div>
      </section>

      {/* Contact Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-teal-500/30 bg-[#111d38]/90">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="badge badge-approved text-xs">Support & Inquiries</span>
              <h2 className="font-heading font-bold text-3xl text-white mt-2">
                Need Help or Network Onboarding?
              </h2>
              <p className="text-slate-300 text-sm mt-3 leading-relaxed">
                Contact our clinical operations team for platform support, hospital integration API keys, or enterprise lab onboarding.
              </p>

              <div className="mt-6 space-y-3 text-xs text-slate-300">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span>100 Kenva Healthcare Plaza, Near MR Palli, Tirupati, AP 517502</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span>+91 877 22-KENVA (+91 877 2253682)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span>support@kenva.health.local</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 border border-slate-700 bg-slate-800/90 space-y-4">
              <h4 className="font-bold text-white text-sm">Send a Message</h4>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Your Name</label>
                <input type="text" placeholder="Kalyan Varma" className="glass-input text-xs" />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Email Address</label>
                <input type="email" placeholder="patient@kenva.local" className="glass-input text-xs" />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Message</label>
                <textarea rows="3" placeholder="How can we assist you with diagnostic sample tracking?" className="glass-input text-xs" />
              </div>
              <button 
                onClick={() => alert('Message submitted to Kenva Support. Thank you!')}
                className="btn-teal text-xs w-full py-2.5 cursor-pointer"
              >
                Submit Inquiry
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
