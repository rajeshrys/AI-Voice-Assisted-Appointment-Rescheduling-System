const cron = require('node-cron');
const db = require('../db');
const { triggerOutboundCall } = require('./telephony.service');
const { getOrCreateSession, addEvent } = require('./conversationState.service');

/**
 * Converts a date string and time slot (e.g. "2026-08-16", "02:30 PM") into a JS Date object.
 */
function parseSlotDateTime(dateStr, timeSlotStr) {
  try {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();

    // Parse time slot e.g. "02:30 PM" or "09:00 AM"
    const match = (timeSlotStr || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return d;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return new Date(year, month, day, hours, minutes);
  } catch (err) {
    return new Date(dateStr);
  }
}

/**
 * Core Scanner: Detects overdue scheduled appointments, updates status to 'MISSED', and auto-dispatches AI Voice Calls.
 */
async function detectAndCallMissedAppointments() {
  console.log('⏰ Running Missed Appointment Autonomous Watcher Scan...');
  const now = new Date();

  try {
    // Fetch all SCHEDULED appointments up to today
    const res = await db.query(
      `SELECT a.*, 
              p.first_name AS patient_first_name, p.last_name AS patient_last_name, p.phone AS patient_phone,
              d.first_name AS doctor_first_name, d.last_name AS doctor_last_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       JOIN doctors d ON a.doctor_id = d.doctor_id
       WHERE a.status = 'SCHEDULED' AND a.appointment_date <= CURRENT_DATE`
    );

    const missedList = [];

    for (const appt of res.rows) {
      const slotDateTime = parseSlotDateTime(appt.appointment_date, appt.time_slot);
      
      // Allow a 15-minute grace period after slot start time
      const bufferTime = new Date(slotDateTime.getTime() + 15 * 60 * 1000);

      if (now > bufferTime) {
        console.log(`🚨 Overdue Missed Appointment Detected: #${appt.appointment_id} (${appt.patient_first_name} ${appt.patient_last_name}) scheduled for ${appt.appointment_date} at ${appt.time_slot}`);

        // 1. Update status to 'MISSED' in appointments table
        await db.query(
          `UPDATE appointments 
           SET status = 'MISSED', updated_at = CURRENT_TIMESTAMP 
           WHERE appointment_id = $1`,
          [appt.appointment_id]
        );

        // 2. Log in appointment_history audit
        await db.query(
          `INSERT INTO appointment_history (appointment_id, old_date, old_time, new_date, new_time, changed_by, status)
           VALUES ($1, $2, $3, NULL, NULL, 'missed_appointment_detector', 'MISSED')`,
          [appt.appointment_id, appt.appointment_date, appt.time_slot]
        );

        // 3. Auto-dispatch outbound telephony AI Voice Call
        const callRes = await triggerOutboundCall({
          appointmentId: appt.appointment_id,
          toPhone: appt.patient_phone || '+15550192831',
          language: 'en',
          provider: 'twilio',
        });

        // 4. Log event
        const session = await getOrCreateSession(callRes.callId, appt.appointment_id, appt.patient_id);
        addEvent(session, 'MISSED_APPOINTMENT_AUTOCALL_DISPATCHED', {
          appointmentId: appt.appointment_id,
          patientName: `${appt.patient_first_name} ${appt.patient_last_name}`,
          doctorName: `Dr. ${appt.doctor_first_name} ${appt.doctor_last_name}`,
          callResult: callRes,
        });

        missedList.push({
          appointmentId: appt.appointment_id,
          patientName: `${appt.patient_first_name} ${appt.patient_last_name}`,
          patientPhone: appt.patient_phone,
          doctorName: `Dr. ${appt.doctor_first_name} ${appt.doctor_last_name}`,
          date: appt.appointment_date,
          time: appt.time_slot,
          callResult: callRes,
        });
      }
    }

    console.log(`✅ Scan Complete. Detected & Auto-Called ${missedList.length} missed appointments.`);
    return missedList;
  } catch (error) {
    console.error('Error in missed appointment detector scan:', error.message);
    return [];
  }
}

/**
 * Initializes the node-cron scheduled job (runs every 5 minutes).
 */
function initMissedAppointmentDetector() {
  console.log('🤖 Initializing Autonomous Missed Appointment Cron Watcher (Running every 5 minutes)...');

  // Schedule cron job: every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await detectAndCallMissedAppointments();
  });

  // Also run an immediate scan 10 seconds after server boot
  setTimeout(async () => {
    await detectAndCallMissedAppointments();
  }, 10000);
}

module.exports = {
  detectAndCallMissedAppointments,
  initMissedAppointmentDetector,
  parseSlotDateTime,
};
