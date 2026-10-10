import React from 'react';
import { Activity, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer({ setActiveTab }) {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-300 text-sm mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
                <Activity className="w-5 h-5" />
              </div>
              <span className="font-heading font-bold text-lg text-white">KENVA HEALTH</span>
            </div>
            <p className="text-xs text-teal-400 font-medium">
              A Digital Nervous System for Modern Clinics
            </p>
            <p className="text-xs text-slate-400">
              The unified digital nerve center for clinical diagnostic coordination, cold-chain sample tracking, and rapid report distribution.
            </p>
          </div>

          {/* Quick Nav */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Quick Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setActiveTab('landing')} className="hover:text-teal-400 transition-colors">
                  Home & Overview
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('about')} className="hover:text-teal-400 transition-colors">
                  About Kenva Platform
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('workflow')} className="hover:text-teal-400 transition-colors">
                  10-Step Sample Journey
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('hospitals')} className="hover:text-teal-400 transition-colors">
                  Partner Hospital Facilities
                </button>
              </li>
            </ul>
          </div>

          {/* Access Portals */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Access Portals</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setActiveTab('register')} className="hover:text-teal-400 transition-colors">
                  Patient Registration
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('login')} className="hover:text-teal-400 transition-colors">
                  Patient Login Portal
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('login')} className="hover:text-teal-400 transition-colors">
                  Hospital Staff Portal
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('login')} className="hover:text-teal-400 transition-colors">
                  Administrator Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Contact Information</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
                <span>100 Kenva Healthcare Plaza, Air Bypass Road, Tirupati, AP 517502</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-teal-400 shrink-0" />
                <span>+91 877 2255001</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-teal-400 shrink-0" />
                <span>support@kenva.health.local</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Copyright */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            Kenva Health Systems — Clinical Diagnostic Coordination & Sample Tracking Platform.
          </div>
          <div className="text-slate-500">
            © {new Date().getFullYear()} Kenva Health Systems Inc. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
