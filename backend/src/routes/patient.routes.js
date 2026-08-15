const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticatePatient } = require('../middleware/auth.middleware');

const JWT_SECRET = process.env.JWT_SECRET || 'hospital_mgmt_jwt_secret_key_2026';

// 1. Patient Registration
router.post('/register', async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone, age, gender, blood_group, address } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'First name, last name, email, and password are required.' });
    }

    const checkExisting = await db.query('SELECT patient_id FROM patients WHERE email = $1', [email]);
    if (checkExisting.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Patient with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO patients (first_name, last_name, email, password_hash, phone, age, gender, blood_group, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING patient_id, first_name, last_name, email, phone, age, gender, blood_group, address, created_at`,
      [first_name, last_name, email, password_hash, phone || null, age || null, gender || null, blood_group || null, address || null]
    );

    const newPatient = result.rows[0];
    const token = jwt.sign({ id: newPatient.patient_id, role: 'patient', email: newPatient.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(201).json({
      success: true,
      message: 'Patient registered successfully.',
      token,
      user: { ...newPatient, role: 'patient' },
    });
  } catch (error) {
    console.error('Patient registration error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error registering patient.' });
  }
});

// 2. Patient Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const result = await db.query('SELECT * FROM patients WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const patient = result.rows[0];
    const isMatch = await bcrypt.compare(password, patient.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    delete patient.password_hash;
    const token = jwt.sign({ id: patient.patient_id, role: 'patient', email: patient.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: { ...patient, role: 'patient' },
    });
  } catch (error) {
    console.error('Patient login error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error logging in patient.' });
  }
});

// 3. Get Authenticated Patient Profile
router.get('/me', authenticatePatient, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT patient_id, first_name, last_name, email, phone, age, gender, blood_group, address, created_at
       FROM patients WHERE patient_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    return res.status(200).json({
      success: true,
      user: { ...result.rows[0], role: 'patient' },
    });
  } catch (error) {
    console.error('Get patient error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error getting patient profile.' });
  }
});

module.exports = router;
