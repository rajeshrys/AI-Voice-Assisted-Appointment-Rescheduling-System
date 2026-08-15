const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateDoctor } = require('../middleware/auth.middleware');

const JWT_SECRET = process.env.JWT_SECRET || 'hospital_mgmt_jwt_secret_key_2026';

// 1. Doctor Registration
router.post('/register', async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      phone,
      specialization,
      qualification,
      experience_years,
      consultation_fee,
      available_days,
      start_time,
      end_time,
      bio,
    } = req.body;

    if (!first_name || !last_name || !email || !password || !phone || !specialization || !qualification) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const existingCheck = await db.query(
      'SELECT doctor_id FROM doctors WHERE email = $1 OR phone = $2',
      [email, phone]
    );
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Doctor with this email or phone already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO doctors (
        first_name, last_name, email, password_hash, phone, specialization, qualification,
        experience_years, consultation_fee, available_days, start_time, end_time, bio
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING doctor_id, first_name, last_name, email, phone, specialization, qualification, experience_years, consultation_fee, available_days, start_time, end_time, bio, created_at`,
      [
        first_name,
        last_name,
        email,
        password_hash,
        phone,
        specialization,
        qualification,
        experience_years || 0,
        consultation_fee || 500.00,
        available_days || 'Monday,Tuesday,Wednesday,Thursday,Friday',
        start_time || '09:00:00',
        end_time || '17:00:00',
        bio || '',
      ]
    );

    const newDoctor = result.rows[0];
    const token = jwt.sign({ id: newDoctor.doctor_id, role: 'doctor', email: newDoctor.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(201).json({
      success: true,
      message: 'Doctor registered successfully.',
      token,
      user: { ...newDoctor, role: 'doctor' },
    });
  } catch (error) {
    console.error('Doctor registration error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error during doctor registration.' });
  }
});

// 2. Doctor Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const result = await db.query('SELECT * FROM doctors WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const doctor = result.rows[0];
    const isMatch = await bcrypt.compare(password, doctor.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    delete doctor.password_hash;
    const token = jwt.sign({ id: doctor.doctor_id, role: 'doctor', email: doctor.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: { ...doctor, role: 'doctor' },
    });
  } catch (error) {
    console.error('Doctor login error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error during doctor login.' });
  }
});

// 3. Get Authenticated Doctor Profile
router.get('/me', authenticateDoctor, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT doctor_id, first_name, last_name, email, phone, specialization, qualification, 
              experience_years, consultation_fee, available_days, start_time, end_time, bio, created_at 
       FROM doctors WHERE doctor_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    return res.status(200).json({
      success: true,
      user: { ...result.rows[0], role: 'doctor' },
    });
  } catch (error) {
    console.error('Get doctor profile error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error retrieving doctor profile.' });
  }
});

// 4. Get List of Specializations
router.get('/specializations/list', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT DISTINCT specialization FROM doctors WHERE specialization IS NOT NULL ORDER BY specialization ASC'
    );
    const specializations = result.rows.map((row) => row.specialization);
    return res.status(200).json({ success: true, specializations });
  } catch (error) {
    console.error('Error fetching specializations:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching specializations.' });
  }
});

// 5. Get All Doctors (Public with filter & search)
router.get('/', async (req, res) => {
  try {
    const { specialization, search } = req.query;
    let queryText = `
      SELECT doctor_id, first_name, last_name, email, phone, specialization, qualification, 
             experience_years, consultation_fee, available_days, start_time, end_time, bio, created_at 
      FROM doctors WHERE 1=1
    `;
    const params = [];

    if (specialization && specialization !== 'All') {
      params.push(specialization);
      queryText += ` AND specialization = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      queryText += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR specialization ILIKE $${params.length})`;
    }

    queryText += ' ORDER BY first_name ASC';

    const result = await db.query(queryText, params);
    return res.status(200).json({ success: true, doctors: result.rows });
  } catch (error) {
    console.error('Error fetching doctors list:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching doctors.' });
  }
});

// 6. Get Doctor by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT doctor_id, first_name, last_name, email, phone, specialization, qualification, 
              experience_years, consultation_fee, available_days, start_time, end_time, bio, created_at 
       FROM doctors WHERE doctor_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    return res.status(200).json({ success: true, doctor: result.rows[0] });
  } catch (error) {
    console.error('Error fetching doctor details:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching doctor details.' });
  }
});

// 7. Update Doctor Profile
router.put('/profile', authenticateDoctor, async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      phone,
      specialization,
      qualification,
      experience_years,
      consultation_fee,
      available_days,
      start_time,
      end_time,
      bio,
    } = req.body;

    const result = await db.query(
      `UPDATE doctors 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           specialization = COALESCE($4, specialization),
           qualification = COALESCE($5, qualification),
           experience_years = COALESCE($6, experience_years),
           consultation_fee = COALESCE($7, consultation_fee),
           available_days = COALESCE($8, available_days),
           start_time = COALESCE($9, start_time),
           end_time = COALESCE($10, end_time),
           bio = COALESCE($11, bio)
       WHERE doctor_id = $12
       RETURNING doctor_id, first_name, last_name, email, phone, specialization, qualification, experience_years, consultation_fee, available_days, start_time, end_time, bio, created_at`,
      [
        first_name,
        last_name,
        phone,
        specialization,
        qualification,
        experience_years,
        consultation_fee,
        available_days,
        start_time,
        end_time,
        bio,
        req.user.id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: { ...result.rows[0], role: 'doctor' },
    });
  } catch (error) {
    console.error('Error updating doctor profile:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error updating doctor profile.' });
  }
});

module.exports = router;
