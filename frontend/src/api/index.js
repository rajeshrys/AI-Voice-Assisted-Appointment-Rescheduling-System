import axios from 'axios';

const DOCTOR_SERVICE_URL = 'http://localhost:5001/api';
const APPOINTMENT_SERVICE_URL = 'http://localhost:5002/api';

export const doctorApi = axios.create({
  baseURL: DOCTOR_SERVICE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const appointmentApi = axios.create({
  baseURL: APPOINTMENT_SERVICE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request Interceptors for JWT token injection
const attachAuthToken = (config) => {
  const token = localStorage.getItem('hms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

doctorApi.interceptors.request.use(attachAuthToken, (error) => Promise.reject(error));
appointmentApi.interceptors.request.use(attachAuthToken, (error) => Promise.reject(error));

// Helper API calls
export const api = {
  // Doctor Service APIs
  getDoctors: (params) => doctorApi.get('/doctors', { params }),
  getDoctorById: (id) => doctorApi.get(`/doctors/${id}`),
  getSpecializations: () => doctorApi.get('/doctors/specializations/list'),
  doctorLogin: (credentials) => doctorApi.post('/doctors/login', credentials),
  doctorRegister: (data) => doctorApi.post('/doctors/register', data),
  getDoctorProfile: () => doctorApi.get('/doctors/me'),
  updateDoctorProfile: (data) => doctorApi.put('/doctors/profile', data),

  // Appointment & Patient Service APIs
  patientLogin: (credentials) => appointmentApi.post('/patients/login', credentials),
  patientRegister: (data) => appointmentApi.post('/patients/register', data),
  getPatientProfile: () => appointmentApi.get('/patients/me'),
  
  bookAppointment: (data) => appointmentApi.post('/appointments', data),
  getBookedSlots: (doctorId, date) => appointmentApi.get('/appointments/booked-slots', { params: { doctor_id: doctorId, date } }),
  getPatientAppointments: () => appointmentApi.get('/appointments/patient'),
  getDoctorAppointments: () => appointmentApi.get('/appointments/doctor'),
  updateAppointmentStatus: (id, status) => appointmentApi.patch(`/appointments/${id}/status`, { status }),
  updatePrescription: (id, data) => appointmentApi.patch(`/appointments/${id}/prescription`, data),
  cancelAppointment: (id) => appointmentApi.delete(`/appointments/${id}`),
};

export default api;
