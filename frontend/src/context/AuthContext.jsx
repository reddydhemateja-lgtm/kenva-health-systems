import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('kenva_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('kenva_token') || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('kenva_token', token);
    } else {
      localStorage.removeItem('kenva_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('kenva_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('kenva_user');
    }
  }, [user]);

  const parseResponse = async (res, defaultErrorMessage) => {
    const contentType = res.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      if (data && data.error) throw new Error(data.error);
      if (res.status === 404) {
        throw new Error('Backend service endpoint not found (404). Please ensure the API server is connected.');
      }
      if (res.status >= 500) {
        throw new Error(`Server temporarily unavailable (${res.status}). Please try again shortly.`);
      }
      throw new Error(defaultErrorMessage || `Request failed with status ${res.status}`);
    }
    return data || {};
  };

  /**
   * STEP 1: Validate credentials -> sends OTP to email (or direct token for admin/hospital)
   */
  const login = async (identifier, password, expectedRole) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, expectedRole })
      });
      const data = await parseResponse(res, 'Login failed. Please check your credentials.');
      // ADMIN/HOSPITAL: direct login - store token immediately
      if (!data.otpSent && data.token) {
        setToken(data.token);
        setUser(data.user);
      }
      // PATIENT: otpSent:true - caller handles OTP step
      return data;
    } finally {
      setLoading(false);
    }
  };

  /**
   * STEP 2: Submit OTP -> receives JWT + user profile
   */
  const verifyOtp = async (userId, otp) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp })
      });
      const data = await parseResponse(res, 'OTP verification failed');
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resend a fresh OTP to the user's email
   */
  const resendOtp = async (userId) => {
    const res = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await parseResponse(res, 'Resend failed');
    return data;
  };

  const registerPatient = async (formData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await parseResponse(res, 'Registration failed');
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('kenva_user');
    localStorage.removeItem('kenva_token');
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error('Refresh user error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, verifyOtp, resendOtp, registerPatient, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
