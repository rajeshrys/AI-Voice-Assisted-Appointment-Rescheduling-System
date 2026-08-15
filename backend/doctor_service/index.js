const express = require('express');
const cors = require('cors');
require('dotenv').config();

const doctorRoutes = require('./src/routes/doctor.routes');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'Doctor Microservice', timestamp: new Date() });
});

// Routes
app.use('/api/doctors', doctorRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Doctor Service Internal Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Doctor microservice encountered an internal error.',
  });
});

app.listen(PORT, () => {
  console.log(`🩺 Doctor Microservice running on port ${PORT}`);
});
