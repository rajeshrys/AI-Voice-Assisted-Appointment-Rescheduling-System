const express = require('express');
const cors = require('cors');
require('dotenv').config();

const initDatabase = require('./src/db/initDb');
const doctorRoutes = require('./src/routes/doctor.routes');
const patientRoutes = require('./src/routes/patient.routes');
const appointmentRoutes = require('./src/routes/appointment.routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Unified Hospital Management System Backend Service',
    database: 'Neon PostgreSQL Cloud',
    timestamp: new Date(),
  });
});

// Mounted Routes
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Backend Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Hospital backend service encountered an internal error.',
  });
});

app.listen(PORT, async () => {
  console.log(`🏥 Unified Backend Service running on port ${PORT}`);
  console.log(`   ├─ Doctor API:      http://localhost:${PORT}/api/doctors`);
  console.log(`   ├─ Patient API:     http://localhost:${PORT}/api/patients`);
  console.log(`   └─ Appointment API: http://localhost:${PORT}/api/appointments`);
  
  // Auto-initialize Neon PostgreSQL tables & seed data
  await initDatabase();
});
