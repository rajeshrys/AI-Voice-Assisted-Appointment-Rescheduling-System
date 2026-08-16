const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateUser, authenticatePatient, authenticateDoctor } = require('../middleware/auth.middleware');

// 1. Book an Appointment (Patient)
router.post('/', authenticatePatient, async (req, res) => {
  try {
    const { doctor_id, appointment_date, time_slot, reason } = req.body;
    const patient_id = req.user.id;

    if (!doctor_id || !appointment_date || !time_slot) {
      return res.status(400).json({ success: false, message: 'Doctor, Date, and Time Slot are required.' });
    }

    const doctorCheck = await db.query('SELECT doctor_id FROM doctors WHERE doctor_id = $1', [doctor_id]);
    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Selected doctor does not exist.' });
    }

    const slotConflict = await db.query(
      `SELECT appointment_id FROM appointments 
       WHERE doctor_id = $1 AND appointment_date = $2 AND time_slot = $3 AND status != 'CANCELLED'`,
      [doctor_id, appointment_date, time_slot]
    );

    if (slotConflict.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'The selected time slot is already booked. Please select another slot or date.',
      });
    }

    const result = await db.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, time_slot, status, reason)
       VALUES ($1, $2, $3, $4, 'SCHEDULED', $5)
       RETURNING *`,
      [patient_id, doctor_id, appointment_date, time_slot, reason || '']
    );

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error('Book appointment error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error booking appointment.' });
  }
});

// 2. Get Booked Slots for Doctor & Date
router.get('/booked-slots', async (req, res) => {
  try {
    const { doctor_id, date } = req.query;
    if (!doctor_id || !date) {
      return res.status(400).json({ success: false, message: 'doctor_id and date query parameters are required.' });
    }

    const result = await db.query(
      `SELECT time_slot FROM appointments 
       WHERE doctor_id = $1 AND appointment_date = $2 AND status != 'CANCELLED'`,
      [doctor_id, date]
    );

    const bookedSlots = result.rows.map((row) => row.time_slot);
    return res.status(200).json({ success: true, bookedSlots });
  } catch (error) {
    console.error('Error fetching booked slots:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching booked slots.' });
  }
});

// 3. Get Patient's Appointments
router.get('/patient', authenticatePatient, async (req, res) => {
  try {
    const patient_id = req.user.id;
    const result = await db.query(
      `SELECT a.*, 
              d.first_name AS doctor_first_name, 
              d.last_name AS doctor_last_name, 
              d.specialization, 
              d.qualification, 
              d.phone AS doctor_phone,
              d.consultation_fee
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.doctor_id
       WHERE a.patient_id = $1
       ORDER BY a.appointment_date DESC, a.created_at DESC`,
      [patient_id]
    );

    return res.status(200).json({ success: true, appointments: result.rows });
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching appointments.' });
  }
});

// 4. Get Doctor's Appointments
router.get('/doctor', authenticateDoctor, async (req, res) => {
  try {
    const doctor_id = req.user.id;
    const result = await db.query(
      `SELECT a.*, 
              p.first_name AS patient_first_name, 
              p.last_name AS patient_last_name, 
              p.email AS patient_email, 
              p.phone AS patient_phone, 
              p.age AS patient_age, 
              p.gender AS patient_gender,
              p.blood_group AS patient_blood_group
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       WHERE a.doctor_id = $1
       ORDER BY a.appointment_date DESC, a.created_at DESC`,
      [doctor_id]
    );

    return res.status(200).json({ success: true, appointments: result.rows });
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching doctor appointments.' });
  }
});

// 5. Update Appointment Status
router.patch('/:id/status', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const apptCheck = await db.query('SELECT * FROM appointments WHERE appointment_id = $1', [id]);
    if (apptCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const appointment = apptCheck.rows[0];

    if (req.user.role === 'patient' && appointment.patient_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized action.' });
    }
    if (req.user.role === 'doctor' && appointment.doctor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized action.' });
    }

    const result = await db.query(
      `UPDATE appointments 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE appointment_id = $2 RETURNING *`,
      [status, id]
    );

    return res.status(200).json({
      success: true,
      message: `Appointment status updated to ${status}.`,
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error updating appointment status.' });
  }
});

// 6. Update Prescription (Doctor)
router.patch('/:id/prescription', authenticateDoctor, async (req, res) => {
  try {
    const { id } = req.params;
    const { prescription, notes } = req.body;

    const apptCheck = await db.query('SELECT * FROM appointments WHERE appointment_id = $1 AND doctor_id = $2', [
      id,
      req.user.id,
    ]);

    if (apptCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found for this doctor.' });
    }

    const result = await db.query(
      `UPDATE appointments 
       SET prescription = $1, notes = $2, status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP 
       WHERE appointment_id = $3 RETURNING *`,
      [prescription || '', notes || '', id]
    );

    return res.status(200).json({
      success: true,
      message: 'Prescription updated and appointment completed.',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating prescription:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error updating prescription.' });
  }
});

// 7. Cancel Appointment
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const apptCheck = await db.query('SELECT * FROM appointments WHERE appointment_id = $1', [id]);
    if (apptCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const appointment = apptCheck.rows[0];

    if (req.user.role === 'patient' && appointment.patient_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized action.' });
    }
    if (req.user.role === 'doctor' && appointment.doctor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized action.' });
    }

    const result = await db.query(
      `UPDATE appointments 
       SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP 
       WHERE appointment_id = $1 RETURNING *`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully.',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error cancelling appointment.' });
  }
});

// 8. GET single appointment by ID (Voice Agent / Public Service)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT a.*, 
              d.first_name AS doctor_first_name, 
              d.last_name AS doctor_last_name, 
              d.specialization, 
              d.phone AS doctor_phone,
              d.available_days AS doctor_available_days,
              d.start_time AS doctor_start_time,
              d.end_time AS doctor_end_time,
              p.first_name AS patient_first_name, 
              p.last_name AS patient_last_name, 
              p.email AS patient_email, 
              p.phone AS patient_phone
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.doctor_id
       JOIN patients p ON a.patient_id = p.patient_id
       WHERE a.appointment_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const appt = result.rows[0];
    return res.status(200).json({
      success: true,
      appointment: {
        appointmentId: appt.appointment_id,
        patientId: appt.patient_id,
        patientName: `${appt.patient_first_name} ${appt.patient_last_name}`,
        patientPhone: appt.patient_phone,
        doctorId: appt.doctor_id,
        doctorName: `Dr. ${appt.doctor_first_name} ${appt.doctor_last_name}`,
        specialization: appt.specialization,
        date: appt.appointment_date,
        time: appt.time_slot,
        status: appt.status.toLowerCase(),
        reason: appt.reason,
      },
    });
  } catch (error) {
    console.error('Error fetching appointment by ID:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching appointment.' });
  }
});

// Helper function to generate standardized time slots
function generateTimeSlots() {
  return [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
  ];
}

// 9. GET Available Slots for an Appointment / Doctor on a specified date
router.get('/:id/available-slots', async (req, res) => {
  try {
    const { id } = req.params;
    const requestedDate = req.query.date;

    const apptCheck = await db.query('SELECT doctor_id, appointment_date FROM appointments WHERE appointment_id = $1', [id]);
    if (apptCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const doctorId = apptCheck.rows[0].doctor_id;
    const targetDate = requestedDate || apptCheck.rows[0].appointment_date;

    // Get existing booked slots for this doctor on targetDate
    const bookedRes = await db.query(
      `SELECT time_slot FROM appointments 
       WHERE doctor_id = $1 AND appointment_date = $2 AND status != 'CANCELLED'`,
      [doctorId, targetDate]
    );

    const bookedSlots = bookedRes.rows.map((r) => r.time_slot);
    const allSlots = generateTimeSlots();
    const availableSlots = allSlots.filter((slot) => !bookedSlots.includes(slot));

    return res.status(200).json({
      success: true,
      appointmentId: id,
      doctorId,
      date: targetDate,
      availableSlots,
      bookedSlots,
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching available slots.' });
  }
});

// 10. POST Reschedule Appointment
router.post('/:id/reschedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { newDate, newTime, reason, changedBy } = req.body;

    if (!newDate || !newTime) {
      return res.status(400).json({ success: false, message: 'newDate and newTime are required for rescheduling.' });
    }

    const apptCheck = await db.query('SELECT * FROM appointments WHERE appointment_id = $1', [id]);
    if (apptCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const currentAppt = apptCheck.rows[0];

    // Check if slot is already booked by another appointment
    const slotConflict = await db.query(
      `SELECT appointment_id FROM appointments 
       WHERE doctor_id = $1 AND appointment_date = $2 AND time_slot = $3 AND status != 'CANCELLED' AND appointment_id != $4`,
      [currentAppt.doctor_id, newDate, newTime, id]
    );

    if (slotConflict.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `The time slot ${newTime} on ${newDate} is already booked. Please choose another slot.`,
      });
    }

    // Update appointment
    const updatedRes = await db.query(
      `UPDATE appointments 
       SET appointment_date = $1, time_slot = $2, status = 'SCHEDULED', updated_at = CURRENT_TIMESTAMP 
       WHERE appointment_id = $3 RETURNING *`,
      [newDate, newTime, id]
    );

    // Insert history audit record
    await db.query(
      `INSERT INTO appointment_history (appointment_id, old_date, old_time, new_date, new_time, changed_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'RESCHEDULED')`,
      [
        id,
        currentAppt.appointment_date,
        currentAppt.time_slot,
        newDate,
        newTime,
        changedBy || 'ai_voice_agent',
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully.',
      appointment: updatedRes.rows[0],
      oldDetails: {
        date: currentAppt.appointment_date,
        time: currentAppt.time_slot,
      },
      newDetails: {
        date: newDate,
        time: newTime,
      },
    });
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error rescheduling appointment.' });
  }
});

// 11. POST Cancel Appointment
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, changedBy } = req.body;

    const apptCheck = await db.query('SELECT * FROM appointments WHERE appointment_id = $1', [id]);
    if (apptCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const currentAppt = apptCheck.rows[0];

    const updatedRes = await db.query(
      `UPDATE appointments 
       SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP 
       WHERE appointment_id = $1 RETURNING *`,
      [id]
    );

    // Insert history audit record
    await db.query(
      `INSERT INTO appointment_history (appointment_id, old_date, old_time, new_date, new_time, changed_by, status)
       VALUES ($1, $2, $3, NULL, NULL, $4, 'CANCELLED')`,
      [
        id,
        currentAppt.appointment_date,
        currentAppt.time_slot,
        changedBy || 'ai_voice_agent',
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully.',
      appointment: updatedRes.rows[0],
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error cancelling appointment.' });
  }
});

module.exports = router;

