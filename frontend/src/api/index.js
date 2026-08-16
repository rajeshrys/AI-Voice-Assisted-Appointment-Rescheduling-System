import axios from 'axios';

// Render production backend gateway URL
const API_GATEWAY_URL =
  import.meta.env.VITE_API_GATEWAY_URL && !import.meta.env.VITE_API_GATEWAY_URL.includes('onrender.com')
    ? import.meta.env.VITE_API_GATEWAY_URL
    : (typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:5000/api'
        : 'https://ai-voice-assisted-appointment.onrender.com/api');

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
  // Reschedule & Voice API Routes
  getAppointmentById: (id) => gatewayApi.get(`/appointments/${id}`),
  getAvailableSlots: (id, date) => gatewayApi.get(`/appointments/${id}/available-slots`, { params: { date } }),
  rescheduleAppointment: (id, data) => gatewayApi.post(`/appointments/${id}/reschedule`, data),
  cancelAppointmentApi: (id, data) => gatewayApi.post(`/appointments/${id}/cancel`, data),

  // Voice Agent Routes
  startVoiceCall: (data) => gatewayApi.post('/voice/start-call', data),
  processSpeech: (data) => gatewayApi.post('/voice/process-speech', data),
  endVoiceCall: (data) => gatewayApi.post('/voice/end-call', data),
  triggerPhoneCall: (data) => gatewayApi.post('/voice/trigger-call', data),
  // Missed Appointment Watcher Routes
  checkMissedAppointments: () => gatewayApi.post('/appointments/check-missed'),
  getMissedAppointments: () => gatewayApi.get('/appointments/missed/list'),
};



export default api;

