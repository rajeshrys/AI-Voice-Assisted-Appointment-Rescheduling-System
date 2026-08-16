const db = require('../db');
const { addEvent, addTurn, syncSessionToDb, endSession } = require('./conversationState.service');

// Executable Tools
const tools = {
  async get_appointment(appointmentId) {
    const res = await db.query(
      `SELECT a.*, 
              d.first_name AS doctor_first_name, d.last_name AS doctor_last_name, d.specialization,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name, p.phone AS patient_phone
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.doctor_id
       JOIN patients p ON a.patient_id = p.patient_id
       WHERE a.appointment_id = $1`,
      [appointmentId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      appointmentId: row.appointment_id,
      patientId: row.patient_id,
      patientName: `${row.patient_first_name} ${row.patient_last_name}`,
      doctorId: row.doctor_id,
      doctorName: `Dr. ${row.doctor_first_name} ${row.doctor_last_name}`,
      specialization: row.specialization,
      date: row.appointment_date,
      time: row.time_slot,
      status: row.status,
    };
  },

  async check_available_slots(appointmentId, targetDate) {
    const appt = await db.query('SELECT doctor_id FROM appointments WHERE appointment_id = $1', [appointmentId]);
    if (appt.rows.length === 0) return { availableSlots: [] };
    const doctorId = appt.rows[0].doctor_id;

    const bookedRes = await db.query(
      `SELECT time_slot FROM appointments 
       WHERE doctor_id = $1 AND appointment_date = $2 AND status != 'CANCELLED'`,
      [doctorId, targetDate]
    );

    const booked = bookedRes.rows.map((r) => r.time_slot);
    const standardSlots = [
      '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
      '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
    ];

    const available = standardSlots.filter((slot) => !booked.includes(slot));
    return {
      doctorId,
      date: targetDate,
      availableSlots: available,
      bookedSlots: booked,
    };
  },

  async reschedule_appointment(appointmentId, newDate, newTime) {
    const appt = await db.query('SELECT * FROM appointments WHERE appointment_id = $1', [appointmentId]);
    if (appt.rows.length === 0) throw new Error('Appointment not found.');

    const currentAppt = appt.rows[0];

    const conflict = await db.query(
      `SELECT appointment_id FROM appointments 
       WHERE doctor_id = $1 AND appointment_date = $2 AND time_slot = $3 AND status != 'CANCELLED' AND appointment_id != $4`,
      [currentAppt.doctor_id, newDate, newTime, appointmentId]
    );

    if (conflict.rows.length > 0) {
      return { success: false, message: `Slot ${newTime} on ${newDate} is taken.` };
    }

    const updated = await db.query(
      `UPDATE appointments 
       SET appointment_date = $1, time_slot = $2, status = 'SCHEDULED', updated_at = CURRENT_TIMESTAMP 
       WHERE appointment_id = $3 RETURNING *`,
      [newDate, newTime, appointmentId]
    );

    await db.query(
      `INSERT INTO appointment_history (appointment_id, old_date, old_time, new_date, new_time, changed_by, status)
       VALUES ($1, $2, $3, $4, $5, 'ai_voice_agent', 'RESCHEDULED')`,
      [appointmentId, currentAppt.appointment_date, currentAppt.time_slot, newDate, newTime]
    );

    return {
      success: true,
      appointment: updated.rows[0],
      oldDate: currentAppt.appointment_date,
      oldTime: currentAppt.time_slot,
      newDate,
      newTime,
    };
  },

  async cancel_appointment(appointmentId, reason = 'Cancelled by patient') {
    const appt = await db.query('SELECT * FROM appointments WHERE appointment_id = $1', [appointmentId]);
    if (appt.rows.length === 0) throw new Error('Appointment not found.');

    const currentAppt = appt.rows[0];

    const updated = await db.query(
      `UPDATE appointments 
       SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP 
       WHERE appointment_id = $1 RETURNING *`,
      [appointmentId]
    );

    await db.query(
      `INSERT INTO appointment_history (appointment_id, old_date, old_time, new_date, new_time, changed_by, status)
       VALUES ($1, $2, $3, NULL, NULL, 'ai_voice_agent', 'CANCELLED')`,
      [appointmentId, currentAppt.appointment_date, currentAppt.time_slot]
    );

    return {
      success: true,
      appointment: updated.rows[0],
      cancelledAt: new Date().toISOString(),
    };
  },
};

// Multi-Language Prompt Translations Dictionary
const i18nPrompts = {
  en: {
    greeting: (pName, dName, date, time) => `Hello ${pName}! I am your automated healthcare assistant. I see you have an appointment with ${dName} scheduled for ${date} at ${time}. How can I assist you today?`,
    askDate: (dName) => `What day would you prefer to move your appointment with ${dName} to? (for example: tomorrow, Friday, or a specific date)`,
    noAvailability: (date, altDate, slots) => `No appointments are available on ${date}. However, I have open slots on ${altDate}: ${slots}. Would one of those work?`,
    vagueTime: (date, period, slots) => `On ${date} ${period}, I have ${slots} available. Which time would you prefer?`,
    askSlotChoice: (date, slots) => `I found open slots for ${date}: ${slots}. Which time works best for you?`,
    rescheduleSuccess: (dName, date, time) => `Perfect! I have rescheduled your appointment with ${dName} to ${date} at ${time}. A confirmation notification has been sent. Thank you!`,
    confirmCancel: (dName, date, time) => `I understand you would like to cancel your appointment with ${dName} scheduled for ${date} at ${time}. Would you like me to go ahead and cancel it?`,
    cancelSuccess: (dName) => `Your appointment with ${dName} has been cancelled successfully. Have a great day!`,
    fallbackError: (dName) => `I can help you reschedule or cancel your appointment with ${dName}. Would you like to pick a new date or cancel your visit?`,
    humanTransfer: "I'm having trouble understanding your request. Would you like me to transfer you to a human staff member?",
  },
  es: {
    greeting: (pName, dName, date, time) => `¡Hola ${pName}! Soy su asistente médico automatizado. Veo que tiene una cita con ${dName} programada para el ${date} a las ${time}. ¿Cómo puedo ayudarle hoy?`,
    askDate: (dName) => `¿Qué día prefiere cambiar su cita con ${dName}? (por ejemplo: mañana, viernes o una fecha específica)`,
    noAvailability: (date, altDate, slots) => `No hay citas disponibles el ${date}. Sin embargo, tengo horarios el ${altDate}: ${slots}. ¿Le serviría alguno?`,
    vagueTime: (date, period, slots) => `El ${date} por la ${period}, tengo disponibles: ${slots}. ¿Qué hora prefiere?`,
    askSlotChoice: (date, slots) => `Encontré los siguientes horarios libres para el ${date}: ${slots}. ¿Cuál prefiere?`,
    rescheduleSuccess: (dName, date, time) => `¡Perfecto! He reprogramado su cita con ${dName} para el ${date} a las ${time}. Se ha enviado una notificación de confirmación. ¡Muchas gracias!`,
    confirmCancel: (dName, date, time) => `Entiendo que desea cancelar su cita con ${dName} programada para el ${date} a las ${time}. ¿Desea que la cancele ahora?`,
    cancelSuccess: (dName) => `Su cita con ${dName} ha sido cancelada con éxito. ¡Que tenga un feliz día!`,
    fallbackError: (dName) => `Puedo ayudarle a reprogramar o cancelar su cita con ${dName}. ¿Desea elegir una nueva fecha o cancelar su visita?`,
    humanTransfer: "Tengo dificultades para entender su solicitud. ¿Desea que lo transfiera con un agente humano?",
  },
  hi: {
    greeting: (pName, dName, date, time) => `नमस्ते ${pName}! मैं आपका स्वचालित स्वास्थ्य सहायक हूँ। ${dName} के साथ आपकी अपॉइंटमेंट ${date} को ${time} बजे निर्धारित है। मैं आज आपकी क्या मदद कर सकता हूँ?`,
    askDate: (dName) => `${dName} के साथ अपनी अपॉइंटमेंट को आप किस दिन बदलना चाहेंगे? (उदाहरण के लिए: कल, शुक्रवार, या कोई विशेष तिथि)`,
    noAvailability: (date, altDate, slots) => `${date} को कोई अपॉइंटमेंट उपलब्ध नहीं है। हालांकि, ${altDate} को यह समय उपलब्ध हैं: ${slots}। क्या इनमें से कोई चलेगा?`,
    vagueTime: (date, period, slots) => `${date} को ${period} में, यह समय उपलब्ध हैं: ${slots}। आप कौन सा समय चुनेंगे?`,
    askSlotChoice: (date, slots) => `${date} के लिए मुझे यह खाली समय मिले हैं: ${slots}। आपके लिए कौन सा समय सबसे अच्छा रहेगा?`,
    rescheduleSuccess: (dName, date, time) => `उत्कृष्ट! मैंने ${dName} के साथ आपकी अपॉइंटमेंट ${date} को ${time} बजे के लिए बदल दी है। पुष्टि सूचना भेज दी गई है। धन्यवाद!`,
    confirmCancel: (dName, date, time) => `मैं समझता हूँ कि आप ${date} को ${time} बजे ${dName} के साथ अपनी अपॉइंटमेंट रद्द करना चाहते हैं। क्या मैं इसे रद्द कर दूँ?`,
    cancelSuccess: (dName) => `${dName} के साथ आपकी अपॉइंटमेंट सफलतापूर्वक रद्द कर दी गई है। आपका दिन शुभ हो!`,
    fallbackError: (dName) => `मैं ${dName} के साथ आपकी अपॉइंटमेंट बदलने या रद्द करने में मदद कर सकता हूँ। क्या आप नई तिथि चुनना चाहते हैं?`,
    humanTransfer: "मुझे आपकी बात समझने में परेशानी हो रही है। क्या आप चाहते हैं कि मैं आपको किसी स्टाफ सदस्य से जोड़ूँ?",
  },
  fr: {
    greeting: (pName, dName, date, time) => `Bonjour ${pName} ! Je suis votre assistant médical automatisé. Vous avez un rendez-vous avec ${dName} le ${date} à ${time}. Comment puis-je vous aider aujourd'hui ?`,
    askDate: (dName) => `À quel jour préférez-vous déplacer votre rendez-vous avec ${dName} ? (par exemple : demain, vendredi, ou une date précise)`,
    noAvailability: (date, altDate, slots) => `Aucun rendez-vous disponible le ${date}. Cependant, des créneaux sont libres le ${altDate} : ${slots}. L'un d'eux vous convient-il ?`,
    vagueTime: (date, period, slots) => `Le ${date} ${period}, j'ai les créneaux suivants : ${slots}. Lequel préférez-vous ?`,
    askSlotChoice: (date, slots) => `J'ai trouvé des créneaux libres pour le ${date} : ${slots}. Lequel préférez-vous ?`,
    rescheduleSuccess: (dName, date, time) => `Parfait ! J'ai déplacé votre rendez-vous avec ${dName} au ${date} à ${time}. Un message de confirmation a été envoyé. Merci !`,
    confirmCancel: (dName, date, time) => `Je comprends que vous souhaitez annuler votre rendez-vous avec ${dName} le ${date} à ${time}. Souhaitez-vous que je l'annule ?`,
    cancelSuccess: (dName) => `Votre rendez-vous avec ${dName} a été annulé avec succès. Bonne journée !`,
    fallbackError: (dName) => `Je peux vous aider à déplacer ou annuler votre rendez-vous avec ${dName}. Souhaitez-vous choisir une nouvelle date ?`,
    humanTransfer: "J'ai du mal à comprendre votre demande. Souhaitez-vous parler à un membre du personnel ?",
  },
  de: {
    greeting: (pName, dName, date, time) => `Hallo ${pName}! Ich bin Ihr automatisierter Gesundheitsassistent. Sie haben einen Termin bei ${dName} am ${date} um ${time}. Wie kann ich Ihnen heute helfen?`,
    askDate: (dName) => `Auf welchen Tag möchten Sie Ihren Termin bei ${dName} verschieben? (zum Beispiel: morgen, Freitag oder ein bestimmtes Datum)`,
    noAvailability: (date, altDate, slots) => `Am ${date} sind keine Termine frei. Am ${altDate} habe ich noch frei: ${slots}. Passt einer davon?`,
    vagueTime: (date, period, slots) => `Am ${date} ${period} habe ich folgende Termine frei: ${slots}. Welchen bevorzugen Sie?`,
    askSlotChoice: (date, slots) => `Ich habe freie Termine für den ${date} gefunden: ${slots}. Welcher passt Ihnen am besten?`,
    rescheduleSuccess: (dName, date, time) => `Perfekt! Ich habe Ihren Termin bei ${dName} auf den ${date} um ${time} verschoben. Eine Bestätigung wurde gesendet. Vielen Dank!`,
    confirmCancel: (dName, date, time) => `Ich verstehe, dass Sie Ihren Termin bei ${dName} am ${date} um ${time} absagen möchten. Soll ich ihn für Sie stornieren?`,
    cancelSuccess: (dName) => `Ihr Termin bei ${dName} wurde erfolgreich abgesagt. Einen schönen Tag noch!`,
    fallbackError: (dName) => `Ich kann Ihnen helfen, Ihren Termin bei ${dName} zu verschieben oder abzusagen. Möchten Sie ein neues Datum wählen?`,
    humanTransfer: "Ich habe Schwierigkeiten, Ihre Anfrage zu verstehen. Möchten Sie mit einem Mitarbeiter verbunden werden?",
  },
};

/**
 * Multi-lingual Date Parser
 */
function parseDateFromSpeech(text, lang = 'en') {
  const lower = text.toLowerCase();
  const today = new Date();

  // Multi-lingual keywords for "today" & "tomorrow"
  if (lower.includes('today') || lower.includes('hoy') || lower.includes('आज') || lower.includes('aujourd\'hui') || lower.includes('heute')) {
    return today.toISOString().split('T')[0];
  }
  if (lower.includes('tomorrow') || lower.includes('mañana') || lower.includes('कल') || lower.includes('demain') || lower.includes('morgen')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  // Days of week mapping across languages
  const dayMaps = {
    sunday: ['sunday', 'domingo', 'रविवार', 'dimanche', 'sonntag'],
    monday: ['monday', 'lunes', 'सोमवार', 'lundi', 'montag'],
    tuesday: ['tuesday', 'martes', 'मंगलवार', 'mardi', 'dienstag'],
    wednesday: ['wednesday', 'miércoles', 'miercoles', 'बुधवार', 'mercredi', 'mittwoch'],
    thursday: ['thursday', 'jueves', 'गुरुवार', 'गुरु', 'jeudi', 'donnerstag'],
    friday: ['friday', 'viernes', 'शुक्रवार', 'शुक्र', 'vendredi', 'freitag'],
    saturday: ['saturday', 'sábado', 'sabado', 'शनिवार', 'samedi', 'samstag'],
  };

  const daysOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  for (let i = 0; i < daysOrder.length; i++) {
    const dayKey = daysOrder[i];
    const keywords = dayMaps[dayKey];
    if (keywords.some((kw) => lower.includes(kw))) {
      const currentDay = today.getDay();
      let diff = i - currentDay;
      if (diff <= 0) diff += 7;
      const target = new Date(today);
      target.setDate(today.getDate() + diff);
      return target.toISOString().split('T')[0];
    }
  }

  const dateMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (dateMatch) return dateMatch[0];

  return null;
}

/**
 * Multi-lingual Time Preference Parser
 */
function parseTimeFromSpeech(text) {
  const lower = text.toLowerCase();

  if (lower.includes('morning') || lower.includes('mañana') || lower.includes('सुबह') || lower.includes('matin') || lower.includes('morgen')) {
    return 'morning';
  }
  if (lower.includes('afternoon') || lower.includes('tarde') || lower.includes('दोपहर') || lower.includes('après-midi') || lower.includes('nachmittag')) {
    return 'afternoon';
  }

  const timeRegex = /\b(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s*(am|pm)?\b/i;
  const match = lower.match(timeRegex);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2] || '00';
    let period = (match[3] || '').toUpperCase();

    if (!period) {
      if (lower.includes('pm') || lower.includes('tarde') || lower.includes('दोपहर') || lower.includes('abend') || hour < 8) {
        period = 'PM';
      } else {
        period = 'AM';
      }
    }
    return `${hour.toString().padStart(2, '0')}:${minute} ${period}`;
  }

  return null;
}

/**
 * Main Multi-Lingual AI Agent Core Execution
 */
async function processSpeechUtterance(session, userSpeech, langOverride = 'en') {
  const lang = session.language || langOverride || 'en';
  const t = i18nPrompts[lang] || i18nPrompts.en;
  const text = (userSpeech || '').trim();

  addTurn(session, 'patient', text);

  let toolExecuted = null;
  let responseText = '';
  let callEnded = false;

  // 1. Initial Greeting Turn
  if (session.turnCount === 1 && !text) {
    addEvent(session, 'CALL_STARTED', { sessionId: session.sessionId, lang });
    const appt = session.appointmentId ? await tools.get_appointment(session.appointmentId) : null;

    if (appt) {
      session.patientId = appt.patientId;
      addEvent(session, 'PATIENT_IDENTIFIED', { patientName: appt.patientName, appt });
      const formattedDate = new Date(appt.date).toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'es' ? 'es-ES' : 'en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

      responseText = t.greeting(appt.patientName, appt.doctorName, formattedDate, appt.time);
      addTurn(session, 'agent', responseText);
      await syncSessionToDb(session);
      return { spokenResponse: responseText, session, toolCalls: [], callEnded: false };
    }
  }

  const appointment = await tools.get_appointment(session.appointmentId);
  if (!appointment) {
    responseText = "I'm sorry, I couldn't locate your appointment details.";
    addTurn(session, 'agent', responseText);
    await syncSessionToDb(session);
    return { spokenResponse: responseText, session, toolCalls: [], callEnded: true };
  }

  const lowerText = text.toLowerCase();

  // 2. Cancellation Intent (Multi-lingual)
  if (
    lowerText.includes('cancel') ||
    lowerText.includes('cancelar') ||
    lowerText.includes('रद्द') ||
    lowerText.includes('annuler') ||
    lowerText.includes('stornieren') ||
    lowerText.includes("don't want")
  ) {
    session.intent = 'cancel';
    addEvent(session, 'INTENT_CANCEL', { userSpeech: text });

    const formattedDate = new Date(appointment.date).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    if (lowerText.includes('yes') || lowerText.includes('sí') || lowerText.includes('si') || lowerText.includes('हाँ') || lowerText.includes('oui') || lowerText.includes('ja')) {
      const cancelRes = await tools.cancel_appointment(session.appointmentId, text);
      toolExecuted = { name: 'cancel_appointment', args: { appointmentId: session.appointmentId }, result: cancelRes };
      addEvent(session, 'APPOINTMENT_CANCELLED', cancelRes);

      responseText = t.cancelSuccess(appointment.doctorName);
      callEnded = true;
      session.status = 'COMPLETED';
    } else {
      responseText = t.confirmCancel(appointment.doctorName, formattedDate, appointment.time);
    }

    addTurn(session, 'agent', responseText, { toolExecuted });
    await syncSessionToDb(session);
    if (callEnded) await endSession(session.sessionId, 'COMPLETED');
    return { spokenResponse: responseText, session, toolCalls: toolExecuted ? [toolExecuted] : [], callEnded };
  }

  // 3. Reschedule Intent / Date & Slot Selection
  if (
    lowerText.includes('reschedule') ||
    lowerText.includes('cambiar') ||
    lowerText.includes('cambio') ||
    lowerText.includes('पुनर्निर्धारित') ||
    lowerText.includes('बदल') ||
    lowerText.includes('déplacer') ||
    lowerText.includes('verschieben') ||
    session.intent === 'reschedule' ||
    parseDateFromSpeech(text, lang) ||
    parseTimeFromSpeech(text)
  ) {
    session.intent = 'reschedule';
    addEvent(session, 'INTENT_RESCHEDULE', { userSpeech: text });

    const extractedDate = parseDateFromSpeech(text, lang);
    if (extractedDate) {
      session.requestedDate = extractedDate;
      session.availableSlots = [];
      session.selectedSlot = null;
    }

    const extractedTime = parseTimeFromSpeech(text);

    if (session.requestedDate) {
      const slotRes = await tools.check_available_slots(session.appointmentId, session.requestedDate);
      toolExecuted = {
        name: 'check_available_slots',
        args: { appointmentId: session.appointmentId, requestedDate: session.requestedDate },
        result: slotRes,
      };

      addEvent(session, 'AVAILABILITY_CHECKED', slotRes);
      let available = slotRes.availableSlots;

      // Edge Case: No availability
      if (available.length === 0) {
        const nextDateObj = new Date(session.requestedDate);
        nextDateObj.setDate(nextDateObj.getDate() + 1);
        const altDate = nextDateObj.toISOString().split('T')[0];
        const altSlotRes = await tools.check_available_slots(session.appointmentId, altDate);

        const formattedTarget = new Date(session.requestedDate).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        const formattedAlt = new Date(altDate).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' });

        responseText = t.noAvailability(formattedTarget, formattedAlt, altSlotRes.availableSlots.slice(0, 3).join(', '));
        addTurn(session, 'agent', responseText, { toolExecuted });
        await syncSessionToDb(session);
        return { spokenResponse: responseText, session, toolCalls: [toolExecuted], callEnded: false };
      }

      // Edge Case: Vague Time
      if (extractedTime === 'morning' || extractedTime === 'afternoon') {
        const sampleSlots = available.slice(0, 3).join(', ');
        const formattedTarget = new Date(session.requestedDate).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'long' });
        responseText = t.vagueTime(formattedTarget, extractedTime, sampleSlots);

        addTurn(session, 'agent', responseText, { toolExecuted });
        await syncSessionToDb(session);
        return { spokenResponse: responseText, session, toolCalls: [toolExecuted], callEnded: false };
      }

      // Slot selection match
      let selectedSlotMatch = null;
      if (extractedTime && extractedTime !== 'morning' && extractedTime !== 'afternoon') {
        selectedSlotMatch = available.find(
          (s) => s.toLowerCase().includes(extractedTime.toLowerCase()) || extractedTime.toLowerCase().includes(s.toLowerCase().split(' ')[0])
        );
      }

      if (!selectedSlotMatch) {
        selectedSlotMatch = available.find((s) => lowerText.includes(s.toLowerCase()) || lowerText.includes(s.toLowerCase().replace(':00', '')));
      }

      if (selectedSlotMatch) {
        session.selectedSlot = selectedSlotMatch;
        addEvent(session, 'SLOT_SELECTED', { selectedSlot: selectedSlotMatch, date: session.requestedDate });

        const rescheduleRes = await tools.reschedule_appointment(
          session.appointmentId,
          session.requestedDate,
          session.selectedSlot
        );

        const rescheduleTool = {
          name: 'reschedule_appointment',
          args: { appointmentId: session.appointmentId, newDate: session.requestedDate, newTime: session.selectedSlot },
          result: rescheduleRes,
        };

        addEvent(session, 'APPOINTMENT_RESCHEDULED', rescheduleRes);

        const formattedDateStr = new Date(session.requestedDate).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });

        responseText = t.rescheduleSuccess(appointment.doctorName, formattedDateStr, session.selectedSlot);
        callEnded = true;
        session.status = 'COMPLETED';

        addTurn(session, 'agent', responseText, { toolExecuted: rescheduleTool });
        await syncSessionToDb(session);
        await endSession(session.sessionId, 'COMPLETED');

        return { spokenResponse: responseText, session, toolCalls: [toolExecuted, rescheduleTool], callEnded };
      }

      const topSlots = available.slice(0, 3).join(', ');
      const formattedTarget = new Date(session.requestedDate).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      responseText = t.askSlotChoice(formattedTarget, topSlots);

      addTurn(session, 'agent', responseText, { toolExecuted });
      await syncSessionToDb(session);
      return { spokenResponse: responseText, session, toolCalls: [toolExecuted], callEnded: false };
    }

    responseText = t.askDate(appointment.doctorName);
    addTurn(session, 'agent', responseText);
    await syncSessionToDb(session);
    return { spokenResponse: responseText, session, toolCalls: [], callEnded: false };
  }

  // 4. Failure Limit Fallback
  session.failedAttempts += 1;
  if (session.failedAttempts >= 3) {
    responseText = t.humanTransfer;
    addEvent(session, 'HUMAN_HANDOFF_TRIGGERED', { failedAttempts: session.failedAttempts });
    addTurn(session, 'agent', responseText);
    await syncSessionToDb(session);
    return { spokenResponse: responseText, session, toolCalls: [], callEnded: false };
  }

  responseText = t.fallbackError(appointment.doctorName);
  addTurn(session, 'agent', responseText);
  await syncSessionToDb(session);
  return { spokenResponse: responseText, session, toolCalls: [], callEnded: false };
}

module.exports = {
  tools,
  processSpeechUtterance,
  parseDateFromSpeech,
  parseTimeFromSpeech,
  i18nPrompts,
};
