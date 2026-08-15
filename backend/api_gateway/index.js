const express = require('express');
const cors = require('cors');
const proxy = require('express-http-proxy');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const DOCTOR_SERVICE_URL = process.env.DOCTOR_SERVICE_URL || 'http://localhost:5001';
const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:5002';

app.use(cors());

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    gateway: 'API Gateway',
    services: {
      doctor_service: DOCTOR_SERVICE_URL,
      appointment_service: APPOINTMENT_SERVICE_URL,
    },
    timestamp: new Date(),
  });
});

// Proxy routes to Microservices
// 1. Doctor Service Routes
app.use('/api/doctors', proxy(DOCTOR_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return '/api/doctors' + req.url;
  }
}));

// 2. Patient Auth Routes -> Appointment Service
app.use('/api/patients', proxy(APPOINTMENT_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return '/api/patients' + req.url;
  }
}));

// 3. Appointment Routes -> Appointment Service
app.use('/api/appointments', proxy(APPOINTMENT_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return '/api/appointments' + req.url;
  }
}));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('API Gateway Error:', err);
  res.status(500).json({ success: false, message: 'API Gateway routing error.', error: err.message });
});

app.listen(PORT, () => {
  console.log(`🌐 API Gateway running on single entry port: http://localhost:${PORT}`);
  console.log(`   └─ Routing /api/doctors      -> ${DOCTOR_SERVICE_URL}`);
  console.log(`   └─ Routing /api/patients     -> ${APPOINTMENT_SERVICE_URL}`);
  console.log(`   └─ Routing /api/appointments -> ${APPOINTMENT_SERVICE_URL}`);
});
