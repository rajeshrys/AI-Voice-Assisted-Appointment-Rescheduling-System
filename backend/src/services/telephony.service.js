const twilio = require('twilio');
const db = require('../db');
const { getOrCreateSession, addEvent } = require('./conversationState.service');

// Read Twilio Credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '+18005550199';
const publicServerUrl = process.env.PUBLIC_SERVER_URL || process.env.FRONTEND_URL || 'https://ai-voice-assisted-appointment.onrender.com';

let twilioClient = null;
if (accountSid && authToken && accountSid.startsWith('AC')) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio Telephony Client initialized.');
  } catch (err) {
    console.warn('⚠️ Twilio initialization notice:', err.message);
  }
}

/**
 * Triggers an outbound phone call to a patient's mobile number.
 */
async function triggerOutboundCall({ appointmentId, toPhone, language = 'en', provider = 'twilio' }) {
  // Fetch appointment & patient details
  const apptRes = await db.query(
    `SELECT a.*, p.phone AS patient_phone, p.first_name, p.last_name 
     FROM appointments a 
     JOIN patients p ON a.patient_id = p.patient_id 
     WHERE a.appointment_id = $1`,
    [appointmentId]
  );

  if (apptRes.rows.length === 0) {
    throw new Error(`Appointment #${appointmentId} not found.`);
  }

  const appt = apptRes.rows[0];
  const targetPhone = toPhone || appt.patient_phone || '+15550192831';
  const callId = `${provider.toUpperCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // Create session state
  const session = await getOrCreateSession(callId, appt.appointment_id, appt.patient_id);
  session.language = language;
  addEvent(session, 'OUTBOUND_CALL_INITIATED', {
    provider,
    targetPhone,
    language,
    appointmentId,
  });

  // Twilio Real Outbound Call Execution
  if (provider === 'twilio' && twilioClient) {
    try {
      const webhookUrl = `${publicServerUrl}/api/voice/webhook?appointmentId=${appointmentId}&lang=${language}&callId=${callId}`;
      const call = await twilioClient.calls.create({
        url: webhookUrl,
        to: targetPhone,
        from: fromPhoneNumber,
      });

      addEvent(session, 'TWILIO_CALL_DISPATCHED', { sid: call.sid, status: call.status });
      return {
        success: true,
        callId,
        provider: 'twilio',
        callSid: call.sid,
        targetPhone,
        status: call.status,
        demoMode: false,
        message: `Outbound call to ${targetPhone} dispatched via Twilio.`,
      };
    } catch (err) {
      console.error('Twilio Outbound Call Error:', err.message);
      // Fallback to demo mode if Twilio fails or trial number unverified
      addEvent(session, 'TELEPHONY_DEMO_FALLBACK', { error: err.message });
      return {
        success: true,
        callId,
        provider: 'twilio',
        targetPhone,
        status: 'queued_demo',
        demoMode: true,
        message: `Simulated Telephony Outbound Call initiated for ${targetPhone} (${language.toUpperCase()}). Twilio Notice: ${err.message}`,
      };
    }
  }

  // Demo / Vapi Telephony Mode (When live keys aren't configured yet)
  return {
    success: true,
    callId,
    provider,
    targetPhone,
    status: 'queued_demo',
    demoMode: true,
    message: `Outbound call to ${targetPhone} (${language.toUpperCase()}) queued in Telephony Simulation Engine.`,
  };
}

module.exports = {
  triggerOutboundCall,
};
