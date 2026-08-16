const express = require('express');
const router = express.Router();
const db = require('../db');
const { getOrCreateSession, endSession } = require('../services/conversationState.service');
const { processSpeechUtterance } = require('../services/voiceAgent.service');
const { triggerOutboundCall } = require('../services/telephony.service');

// Language mapping to Twilio TwiML language codes
const twilioLangMap = {
  en: 'en-US',
  es: 'es-ES',
  hi: 'hi-IN',
  fr: 'fr-FR',
  de: 'de-DE',
};

// 1. Trigger Outbound Mobile Phone Call (Twilio / Vapi)
router.post('/trigger-call', async (req, res) => {
  try {
    const { appointmentId, toPhone, language, provider } = req.body;
    if (!appointmentId) {
      return res.status(400).json({ success: false, message: 'appointmentId is required to trigger phone call.' });
    }

    const result = await triggerOutboundCall({
      appointmentId,
      toPhone,
      language: language || 'en',
      provider: provider || 'twilio',
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error triggering phone call:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error triggering phone call.' });
  }
});

// 2. Start an AI Voice Call session (Simulator or Web API)
router.post('/start-call', async (req, res) => {
  try {
    const { appointmentId, callId: customCallId, language } = req.body;
    if (!appointmentId) {
      return res.status(400).json({ success: false, message: 'appointmentId is required to start a call.' });
    }

    const callId = customCallId || `CALL_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const apptRes = await db.query('SELECT * FROM appointments WHERE appointment_id = $1', [appointmentId]);
    if (apptRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const appt = apptRes.rows[0];
    const session = await getOrCreateSession(callId, appt.appointment_id, appt.patient_id);
    if (language) session.language = language;

    const result = await processSpeechUtterance(session, '', language || 'en');

    return res.status(200).json({
      success: true,
      callId,
      session,
      spokenResponse: result.spokenResponse,
      callEnded: result.callEnded,
    });
  } catch (error) {
    console.error('Error starting voice call:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error starting voice call.' });
  }
});

// 3. Process Spoken Speech Utterance (STT input)
router.post('/process-speech', async (req, res) => {
  try {
    const { callId, speechText, language } = req.body;
    if (!callId) {
      return res.status(400).json({ success: false, message: 'callId is required.' });
    }

    const session = await getOrCreateSession(callId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Active call session not found.' });
    }

    if (language) session.language = language;

    const result = await processSpeechUtterance(session, speechText || '', language || session.language || 'en');

    return res.status(200).json({
      success: true,
      callId,
      spokenResponse: result.spokenResponse,
      toolCalls: result.toolCalls || [],
      callEnded: result.callEnded || false,
      session,
    });
  } catch (error) {
    console.error('Error processing speech:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error processing speech.' });
  }
});

// 4. End Call
router.post('/end-call', async (req, res) => {
  try {
    const { callId, reason } = req.body;
    if (!callId) {
      return res.status(400).json({ success: false, message: 'callId is required.' });
    }

    await endSession(callId, reason || 'USER_DISCONNECTED');
    return res.status(200).json({ success: true, message: 'Call session terminated.' });
  } catch (error) {
    console.error('Error ending call:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error ending call.' });
  }
});

// 5. GET Call Logs for Voice Dashboard
router.get('/call-logs', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT cl.*, 
              p.first_name AS patient_first_name, p.last_name AS patient_last_name, p.phone AS patient_phone,
              a.appointment_date, a.time_slot, a.status AS appointment_status,
              d.first_name AS doctor_first_name, d.last_name AS doctor_last_name, d.specialization
       FROM call_logs cl
       LEFT JOIN patients p ON cl.patient_id = p.patient_id
       LEFT JOIN appointments a ON cl.appointment_id = a.appointment_id
       LEFT JOIN doctors d ON a.doctor_id = d.doctor_id
       ORDER BY cl.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      callLogs: result.rows.map((row) => ({
        logId: row.log_id,
        callId: row.call_id,
        appointmentId: row.appointment_id,
        patientName: row.patient_first_name ? `${row.patient_first_name} ${row.patient_last_name}` : 'Patient',
        patientPhone: row.patient_phone,
        doctorName: row.doctor_first_name ? `Dr. ${row.doctor_first_name} ${row.doctor_last_name}` : 'Doctor',
        specialization: row.specialization,
        status: row.status,
        intent: row.intent,
        transcript: row.transcript || [],
        events: row.events || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching call logs:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching call logs.' });
  }
});

// 6. GET Single Call Log Detail
router.get('/call-logs/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const result = await db.query(
      `SELECT cl.*, 
              p.first_name AS patient_first_name, p.last_name AS patient_last_name, p.email AS patient_email, p.phone AS patient_phone,
              a.appointment_date, a.time_slot, a.status AS appointment_status,
              d.first_name AS doctor_first_name, d.last_name AS doctor_last_name, d.specialization
       FROM call_logs cl
       LEFT JOIN patients p ON cl.patient_id = p.patient_id
       LEFT JOIN appointments a ON cl.appointment_id = a.appointment_id
       LEFT JOIN doctors d ON a.doctor_id = d.doctor_id
       WHERE cl.call_id = $1`,
      [callId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Call log not found.' });
    }

    const row = result.rows[0];
    const historyRes = await db.query(
      `SELECT * FROM appointment_history WHERE appointment_id = $1 ORDER BY created_at DESC`,
      [row.appointment_id]
    );

    return res.status(200).json({
      success: true,
      callLog: {
        logId: row.log_id,
        callId: row.call_id,
        appointmentId: row.appointment_id,
        patientName: row.patient_first_name ? `${row.patient_first_name} ${row.patient_last_name}` : 'Patient',
        patientEmail: row.patient_email,
        patientPhone: row.patient_phone,
        doctorName: row.doctor_first_name ? `Dr. ${row.doctor_first_name} ${row.doctor_last_name}` : 'Doctor',
        specialization: row.specialization,
        status: row.status,
        intent: row.intent,
        transcript: row.transcript || [],
        events: row.events || [],
        history: historyRes.rows,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error('Error fetching call log details:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching call log details.' });
  }
});

// 7. Telephony TwiML Webhook Endpoint (Twilio / Vapi Real Call Bridge)
router.all('/webhook', async (req, res) => {
  try {
    const { CallSid, SpeechResult, appointmentId, lang: queryLang, callId: queryCallId } = {
      ...req.query,
      ...req.body,
    };

    const callId = CallSid || queryCallId || `TWILIO_${Date.now()}`;
    const lang = queryLang || 'en';
    const twilioLang = twilioLangMap[lang] || 'en-US';

    const session = await getOrCreateSession(callId, appointmentId);
    session.language = lang;

    const result = await processSpeechUtterance(session, SpeechResult || '', lang);

    res.set('Content-Type', 'text/xml');
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${twilioLang}">${result.spokenResponse}</Say>
  ${
    !result.callEnded
      ? `<Gather input="speech" language="${twilioLang}" action="/api/voice/webhook?appointmentId=${appointmentId}&amp;lang=${lang}&amp;callId=${callId}" timeout="4" />`
      : '<Hangup />'
  }
</Response>`);
  } catch (error) {
    console.error('Telephony Webhook Error:', error);
    res.set('Content-Type', 'text/xml');
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>An error occurred in the voice service.</Say>
  <Hangup />
</Response>`);
  }
});

module.exports = router;
