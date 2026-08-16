const db = require('../db');

// In-memory store for active call sessions
const activeSessions = new Map();

/**
 * Initializes or retrieves an active conversation session.
 */
async function getOrCreateSession(callId, appointmentId = null, patientId = null) {
  if (!activeSessions.has(callId)) {
    // Attempt to load existing call log from DB if available
    const dbRes = await db.query('SELECT * FROM call_logs WHERE call_id = $1', [callId]);
    if (dbRes.rows.length > 0) {
      const row = dbRes.rows[0];
      const session = {
        sessionId: row.call_id,
        appointmentId: row.appointment_id,
        patientId: row.patient_id,
        intent: row.intent || null,
        requestedDate: null,
        requestedTime: null,
        availableSlots: [],
        selectedSlot: null,
        status: row.status || 'IN_PROGRESS',
        turnCount: (row.transcript || []).length,
        failedAttempts: 0,
        history: row.transcript || [],
        events: row.events || [],
      };
      activeSessions.set(callId, session);
    } else {
      // Create new session object
      const newSession = {
        sessionId: callId,
        appointmentId: appointmentId ? parseInt(appointmentId, 10) : null,
        patientId: patientId ? parseInt(patientId, 10) : null,
        intent: null,
        requestedDate: null,
        requestedTime: null,
        availableSlots: [],
        selectedSlot: null,
        status: 'IN_PROGRESS',
        turnCount: 0,
        failedAttempts: 0,
        history: [],
        events: [],
      };

      activeSessions.set(callId, newSession);

      // Create record in DB
      try {
        await db.query(
          `INSERT INTO call_logs (call_id, patient_id, appointment_id, status, intent, transcript, events)
           VALUES ($1, $2, $3, 'IN_PROGRESS', NULL, '[]'::jsonb, '[]'::jsonb)
           ON CONFLICT (call_id) DO NOTHING`,
          [callId, newSession.patientId, newSession.appointmentId]
        );
      } catch (err) {
        console.error('Error inserting initial call log:', err.message);
      }
    }
  }

  return activeSessions.get(callId);
}

/**
 * Adds an event to the call session log.
 */
function addEvent(session, eventType, details = {}) {
  const event = {
    timestamp: new Date().toISOString(),
    eventType,
    details,
  };
  session.events.push(event);
  return event;
}

/**
 * Adds a dialogue turn to history.
 */
function addTurn(session, speaker, message, metadata = {}) {
  const turn = {
    timestamp: new Date().toISOString(),
    speaker, // 'patient' or 'agent'
    message,
    ...metadata,
  };
  session.history.push(turn);
  session.turnCount += 1;
  return turn;
}

/**
 * Saves session state updates to DB.
 */
async function syncSessionToDb(session) {
  try {
    await db.query(
      `UPDATE call_logs 
       SET status = $1, intent = $2, transcript = $3::jsonb, events = $4::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE call_id = $5`,
      [
        session.status,
        session.intent,
        JSON.stringify(session.history),
        JSON.stringify(session.events),
        session.sessionId,
      ]
    );
  } catch (err) {
    console.error('Error syncing call log to DB:', err.message);
  }
}

/**
 * End a call session.
 */
async function endSession(callId, finalStatus = 'COMPLETED') {
  const session = activeSessions.get(callId);
  if (session) {
    session.status = finalStatus;
    addEvent(session, 'CALL_ENDED', { finalStatus });
    await syncSessionToDb(session);
    activeSessions.delete(callId);
  }
}

module.exports = {
  getOrCreateSession,
  addEvent,
  addTurn,
  syncSessionToDb,
  endSession,
  activeSessions,
};
