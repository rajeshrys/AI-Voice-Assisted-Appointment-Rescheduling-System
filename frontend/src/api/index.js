import axios from 'axios';

// In Production (Vercel build), automatically defaults to https://ai-voice-assisted-appointment.onrender.com/api
// In Development (Local), defaults to http://localhost:5000/api
const API_GATEWAY_URL =
  import.meta.env.VITE_API_GATEWAY_URL ||
  (import.meta.env.PROD
    ? 'https://ai-voice-assisted-appointment.onrender.com/api'
    : 'http://localhost:5000/api');

export const gatewayApi = axios.create({
  baseURL: API_GATEWAY_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request Interceptor for JWT token injection
gatewayApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Unified API Methods
export const api = {
  // Doctor Routes
  getDoctors: (params) => gatewayApi.get('/doctors', { params }),
  getDoctorById: (id) => gatewayApi.get(`/doctors/${id}`),
  getSpecializations: () => gatewayApi.get('/doctors/specializations/list'),
  doctorLogin: (credentials) => gatewayApi.post('/doctors/login', credentials),
  doctorRegister: (data) => gatewayApi.post('/doctors/register', data),
  getDoctorProfile: () => gatewayApi.get('/doctors/me'),
  updateDoctorProfile: (data) => gatewayApi.put('/doctors/profile', data),

  // Patient & Appointment Routes
  patientLogin: (credentials) => gatewayApi.post('/patients/login', credentials),
  patientRegister: (data) => gatewayApi.post('/patients/register', data),
  getPatientProfile: () => gatewayApi.get('/patients/me'),

  bookAppointment: (data) => gatewayApi.post('/appointments', data),
  getBookedSlots: (doctorId, date) =>
    gatewayApi.get('/appointments/booked-slots', { params: { doctor_id: doctorId, date } }),
  getPatientAppointments: () => gatewayApi.get('/appointments/patient'),
  getDoctorAppointments: () => gatewayApi.get('/appointments/doctor'),
  updateAppointmentStatus: (id, status) => gatewayApi.patch(`/appointments/${id}/status`, { status }),
  updatePrescription: (id, data) => gatewayApi.patch(`/appointments/${id}/prescription`, data),
  cancelAppointment: (id) => gatewayApi.delete(`/appointments/${id}`),
};

export default api;
