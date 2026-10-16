import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import DemoCredentialsModal from './components/DemoCredentialsModal';

import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import PatientDashboard from './pages/PatientDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsConditionsPage from './pages/TermsConditionsPage';

function MainApp() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('landing');
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  // Automatically update active tab if user logs in
  useEffect(() => {
    if (user) {
      if (user.role === 'PATIENT' && activeTab === 'login') setActiveTab('patient-dashboard');
      else if (user.role === 'HOSPITAL' && activeTab === 'login') setActiveTab('hospital-dashboard');
      else if (user.role === 'ADMIN' && activeTab === 'login') setActiveTab('admin-dashboard');
    }
  }, [user]);

  const renderContent = () => {
    switch (activeTab) {
      case 'landing':
      case 'about':
      case 'workflow':
      case 'hospitals':
        return (
          <LandingPage 
            setActiveTab={setActiveTab} 
            onOpenDemoModal={() => setIsDemoModalOpen(true)} 
          />
        );
      
      case 'register':
        return <RegisterPage setActiveTab={setActiveTab} />;

      case 'login':
        return (
          <LoginPage 
            setActiveTab={setActiveTab} 
            onOpenDemoModal={() => setIsDemoModalOpen(true)} 
          />
        );

      case 'privacy':
        return <PrivacyPolicyPage setActiveTab={setActiveTab} />;

      case 'terms':
        return <TermsConditionsPage setActiveTab={setActiveTab} />;

      case 'patient-dashboard':
        if (!user || user.role !== 'PATIENT') {
          return <LoginPage setActiveTab={setActiveTab} onOpenDemoModal={() => setIsDemoModalOpen(true)} />;
        }
        return <PatientDashboard setActiveTab={setActiveTab} />;

      case 'hospital-dashboard':
        if (!user || (user.role !== 'HOSPITAL' && user.role !== 'ADMIN')) {
          return <LoginPage setActiveTab={setActiveTab} onOpenDemoModal={() => setIsDemoModalOpen(true)} />;
        }
        return <HospitalDashboard />;

      case 'admin-dashboard':
        if (!user || user.role !== 'ADMIN') {
          return <LoginPage setActiveTab={setActiveTab} onOpenDemoModal={() => setIsDemoModalOpen(true)} />;
        }
        return <AdminDashboard />;

      default:
        return <LandingPage setActiveTab={setActiveTab} onOpenDemoModal={() => setIsDemoModalOpen(true)} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 font-sans selection:bg-teal-500 selection:text-slate-950">
      
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenDemoModal={() => setIsDemoModalOpen(true)} 
      />

      <main className="flex-1">
        {renderContent()}
      </main>

      <Footer setActiveTab={setActiveTab} />

      <DemoCredentialsModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        setActiveTab={setActiveTab}
      />
      
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
