import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'patient' | 'doctor' | null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('hms_token');
      const savedRole = localStorage.getItem('hms_role');

      if (token && savedRole) {
        try {
          if (savedRole === 'doctor') {
            const res = await api.getDoctorProfile();
            if (res.data.success) {
              setUser(res.data.user);
              setRole('doctor');
            }
          } else if (savedRole === 'patient') {
            const res = await api.getPatientProfile();
            if (res.data.success) {
              setUser(res.data.user);
              setRole('patient');
            }
          }
        } catch (error) {
          console.error('Session restoration failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password, userType) => {
    setLoading(true);
    try {
      let res;
      if (userType === 'doctor') {
        res = await api.doctorLogin({ email, password });
      } else {
        res = await api.patientLogin({ email, password });
      }

      if (res.data.success) {
        const { token, user: userData } = res.data;
        localStorage.setItem('hms_token', token);
        localStorage.setItem('hms_role', userType);
        setUser(userData);
        setRole(userType);
        setLoading(false);
        return { success: true, message: res.data.message };
      }
    } catch (error) {
      setLoading(false);
      const errMsg = error.response?.data?.message || 'Login failed. Please check credentials.';
      return { success: false, message: errMsg };
    }
  };

  const register = async (formData, userType) => {
    setLoading(true);
    try {
      let res;
      if (userType === 'doctor') {
        res = await api.doctorRegister(formData);
      } else {
        res = await api.patientRegister(formData);
      }

      if (res.data.success) {
        const { token, user: userData } = res.data;
        localStorage.setItem('hms_token', token);
        localStorage.setItem('hms_role', userType);
        setUser(userData);
        setRole(userType);
        setLoading(false);
        return { success: true, message: res.data.message };
      }
    } catch (error) {
      setLoading(false);
      const errMsg = error.response?.data?.message || 'Registration failed. Please check input data.';
      return { success: false, message: errMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('hms_role');
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
