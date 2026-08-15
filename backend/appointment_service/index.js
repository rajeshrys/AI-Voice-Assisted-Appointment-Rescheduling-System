const express = require('express');
const cors = require('cors');
require('dotenv').config();

const patientRoutes = require('./src/routes/patient.routes');
const appointmentRoutes = require('./src/routes/appointment.routes');

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'Appointment & Patient Microservice', timestamp: new Date() });
});

// Routes
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Appointment Service Internal Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Appointment microservice encountered an internal error.',
  });
});

app.listen(PORT, () => {
  console.log(`📅 Appointment & Patient Microservice running on port ${PORT}`);
});
