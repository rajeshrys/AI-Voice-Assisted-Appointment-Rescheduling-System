import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Send,
  Bot,
  User,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  RefreshCw,
  Activity,
  ChevronRight,
  Database,
  FileText,
  Volume2,
  Globe,
  Radio,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';

const languageOptions = [
  { code: 'en', label: 'English (US)', locale: 'en-US', flag: '🇺🇸' },
  { code: 'es', label: 'Spanish (Español)', locale: 'es-ES', flag: '🇪🇸' },
  { code: 'hi', label: 'Hindi (हिंदी)', locale: 'hi-IN', flag: '🇮🇳' },
  { code: 'fr', label: 'French (Français)', locale: 'fr-FR', flag: '🇫🇷' },
  { code: 'de', label: 'German (Deutsch)', locale: 'de-DE', flag: '🇩🇪' },
];

const samplePresetsByLang = {
  en: [
    'Hi, I want to reschedule my appointment to Friday afternoon.',
    'What morning slots do you have available?',
    'Around 2 PM would be great.',
    'Actually, can we make that Monday instead?',
    'I want to cancel my appointment.',
  ],
  es: [
    'Hola, quiero cambiar mi cita para el viernes por la tarde.',
    '¿Qué horarios tienen disponibles por la mañana?',
    'A las 2 PM estaría bien.',
    'De hecho, ¿podemos cambiarlo para el lunes?',
    'Quiero cancelar mi cita.',
  ],
  hi: [
    'नमस्ते, मैं अपनी अपॉइंटमेंट शुक्रवार दोपहर में बदलना चाहता हूँ।',
    'सुबह कौन से समय उपलब्ध हैं?',
    'दोपहर 2 बजे ठीक रहेगा।',
    'क्या हम इसे सोमवार को कर सकते हैं?',
    'मैं अपनी अपॉइंटमेंट रद्द करना चाहता हूँ।',
  ],
  fr: [
    'Bonjour, je souhaite déplacer mon rendez-vous à vendredi après-midi.',
    'Quels créneaux sont disponibles le matin ?',
    'Vers 14h ce serait parfait.',
    'En fait, pouvons-nous le fixer à lundi ?',
    'Je souhaite annuler mon rendez-vous.',
  ],
  de: [
    'Hallo, ich möchte meinen Termin auf Freitag am Nachmittag verschieben.',
    'Welche Termine sind am Morgen frei?',
    'Um 14 Uhr wäre gut.',
    'Können wir den Termin stattdessen am Montag machen?',
    'Ich möchte meinen Termin absagen.',
  ],
};

export default function VoiceDashboard() {
  const [searchParams] = useSearchParams();
  const initialApptId = searchParams.get('appointmentId') || '1';

  // App & Call Session State
  const [appointmentId, setAppointmentId] = useState(initialApptId);
  const [selectedLang, setSelectedLang] = useState('en');
  const [callSession, setCallSession] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // idle | dialing | active | ended
  const [transcript, setTranscript] = useState([]);
  const [toolLogs, setToolLogs] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTtsActive, setIsTtsActive] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Outbound Mobile Phone Call Modal State
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [targetPhone, setTargetPhone] = useState('+1 (555) 019-2831');
  const [telephonyProvider, setTelephonyProvider] = useState('twilio'); // twilio | vapi
  const [telephonyStatusMsg, setTelephonyStatusMsg] = useState(null);

  // System Audit & Logs State
  const [callLogsList, setCallLogsList] = useState([]);
  const [selectedCallDetail, setSelectedCallDetail] = useState(null);
  const [activeTab, setActiveTab] = useState('call_simulator'); // call_simulator | audit_logs

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  const currentLangObj = languageOptions.find((l) => l.code === selectedLang) || languageOptions[0];

  // Initialize Speech Recognition bound to selected language
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = currentLangObj.locale;

      recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        console.log('🎤 Speech Recognized:', speechResult);
        setInputText(speechResult);
        handleSendSpeech(speechResult);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (err) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [selectedLang, callSession]);

  useEffect(() => {
    fetchCallLogs();
  }, []);

  useEffect(() => {
    if (callStatus === 'active') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const fetchCallLogs = async () => {
    try {
      const res = await api.getCallLogs();
      if (res.data.success) {
        setCallLogsList(res.data.callLogs);
      }
    } catch (err) {
      console.error('Error fetching call logs:', err);
    }
  };

  // Text-To-Speech Synthesis bound to selected language locale
  const speakText = (text) => {
    if (!isTtsActive || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLangObj.locale;
    utterance.rate = 0.95;

    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // 1. Start AI Voice Call Simulator
  const handleStartCall = async () => {
    if (!appointmentId) return;
    setLoading(true);
    setCallStatus('dialing');
    setTranscript([]);
    setToolLogs([]);
    setCallDuration(0);

    try {
      const res = await api.startVoiceCall({ appointmentId, language: selectedLang });
      if (res.data.success) {
        setCallSession(res.data.session);
        setCallStatus('active');

        if (res.data.spokenResponse) {
          setTranscript([{ speaker: 'agent', text: res.data.spokenResponse, timestamp: new Date().toLocaleTimeString() }]);
          speakText(res.data.spokenResponse);
        }
      }
    } catch (err) {
      console.error('Failed to start call:', err);
      alert(err.response?.data?.message || 'Failed to start AI Voice Call session.');
      setCallStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  // 2. Trigger Outbound Mobile Phone Call (Twilio / Vapi)
  const handleTriggerMobileCall = async () => {
    if (!appointmentId || !targetPhone) return;
    setLoading(true);
    setTelephonyStatusMsg(null);

    try {
      const res = await api.triggerPhoneCall({
        appointmentId,
        toPhone: targetPhone,
        language: selectedLang,
        provider: telephonyProvider,
      });

      if (res.data.success) {
        setTelephonyStatusMsg(res.data.message);
        fetchCallLogs();
      }
    } catch (err) {
      console.error('Telephony Call Error:', err);
      alert(err.response?.data?.message || 'Failed to trigger outbound mobile phone call.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Process Speech Turn
  const handleSendSpeech = async (overrideText = null) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim() || !callSession || callStatus !== 'active') return;

    setInputText('');
    setLoading(true);

    setTranscript((prev) => [
      ...prev,
      { speaker: 'patient', text: textToSend, timestamp: new Date().toLocaleTimeString() },
    ]);

    try {
      const res = await api.processSpeech({
        callId: callSession.sessionId,
        speechText: textToSend,
        language: selectedLang,
      });

      if (res.data.success) {
        const { spokenResponse, toolCalls, callEnded, session } = res.data;
        setCallSession(session);

        if (toolCalls && toolCalls.length > 0) {
          setToolLogs((prev) => [...prev, ...toolCalls]);
        }

        if (spokenResponse) {
          setTranscript((prev) => [
            ...prev,
            { speaker: 'agent', text: spokenResponse, timestamp: new Date().toLocaleTimeString() },
          ]);
          speakText(spokenResponse);
        }

        if (callEnded) {
          setCallStatus('ended');
          fetchCallLogs();
        }
      }
    } catch (err) {
      console.error('Error processing speech turn:', err);
    } finally {
      setLoading(false);
    }
  };

  // 4. Microphone Toggle
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome or type your speech.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // 5. End Call
  const handleEndCall = async () => {
    if (callSession) {
      try {
        await api.endVoiceCall({ callId: callSession.sessionId, reason: 'PATIENT_DISCONNECTED' });
      } catch (err) {
        console.error('Error ending call:', err);
      }
    }
    window.speechSynthesis.cancel();
    setCallStatus('ended');
    setIsListening(false);
    fetchCallLogs();
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleViewLogDetail = async (callId) => {
    try {
      const res = await api.getCallLogById(callId);
      if (res.data.success) {
        setSelectedCallDetail(res.data.callLog);
      }
    } catch (err) {
      console.error('Error fetching log detail:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-cyan-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="bg-teal-500/30 text-teal-200 uppercase text-xs px-3 py-1 rounded-full border border-teal-400/40 flex items-center gap-1.5 font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Multi-Lingual AI Voice Engine
            </span>
          </div>
          <h1 className="text-3xl font-extrabold mt-3 tracking-tight">AI Voice Rescheduling & Telephony</h1>
          <p className="text-teal-100 text-sm mt-1 max-w-2xl">
            Autonomous multi-lingual speech agent (English 🇺🇸, Spanish 🇪🇸, Hindi 🇮🇳, French 🇫🇷, German 🇩🇪) with real Twilio & Vapi mobile phone call integration.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20">
          <button
            onClick={() => setActiveTab('call_simulator')}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'call_simulator'
                ? 'bg-white text-teal-900 shadow-md font-bold'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <Phone className="w-4 h-4" /> Voice Simulator
          </button>
          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'audit_logs'
                ? 'bg-white text-teal-900 shadow-md font-bold'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <Database className="w-4 h-4" /> Call & Audit Logs
          </button>
        </div>
      </div>

      {activeTab === 'call_simulator' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Language Picker, Controls & Phone UI */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              {/* Phone Bar */}
              <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-slate-400 font-mono ml-2">Phone Call Simulator</span>
                </div>
                <button
                  onClick={() => setIsTtsActive(!isTtsActive)}
                  className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                    isTtsActive
                      ? 'bg-teal-500/20 text-teal-400 border-teal-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  {isTtsActive ? 'Voice ON' : 'Muted'}
                </button>
              </div>

              {/* Language Selector & Controls Header */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 space-y-4">
                {/* Language Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-teal-600" /> Select AI Voice Language
                  </label>
                  <select
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value)}
                    disabled={callStatus === 'active'}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-slate-100"
                  >
                    {languageOptions.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Appointment ID & Outbound Mobile Phone Button */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Target Appointment ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={appointmentId}
                      onChange={(e) => setAppointmentId(e.target.value)}
                      disabled={callStatus === 'active' || callStatus === 'dialing'}
                      placeholder="e.g. 1"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-slate-100"
                    />
                    {callStatus === 'idle' || callStatus === 'ended' ? (
                      <button
                        onClick={handleStartCall}
                        disabled={loading || !appointmentId}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                      >
                        <Phone className="w-4 h-4" /> Start Web Call
                      </button>
                    ) : (
                      <button
                        onClick={handleEndCall}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all flex items-center gap-1.5 shrink-0"
                      >
                        <PhoneOff className="w-4 h-4" /> End Call
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setShowPhoneModal(true)}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-800 hover:to-purple-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    <Radio className="w-4 h-4 text-purple-300" /> Trigger Real Mobile Call (Twilio / Vapi)
                  </button>
                </div>

                {/* Call Status Visualizer */}
                <div className="bg-slate-900 rounded-2xl p-6 text-center space-y-3 relative overflow-hidden">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow-lg relative">
                    <Bot className="w-10 h-10 text-white" />
                    {isAiSpeaking && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-teal-500"></span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-white font-bold text-lg">Hospital AI Assistant ({currentLangObj.flag})</h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {callStatus === 'idle' && `Ready (${currentLangObj.label})`}
                      {callStatus === 'dialing' && 'Connecting to patient phone line...'}
                      {callStatus === 'active' && `Call active (${formatTime(callDuration)})`}
                      {callStatus === 'ended' && 'Call Ended'}
                    </p>
                  </div>

                  {callStatus === 'active' && (
                    <div className="flex justify-center items-center gap-1.5 h-6">
                      <span className={`w-1 bg-teal-400 rounded-full transition-all ${isAiSpeaking ? 'h-6 animate-pulse' : 'h-2'}`} />
                      <span className={`w-1 bg-teal-400 rounded-full transition-all ${isAiSpeaking ? 'h-4 animate-pulse delay-75' : 'h-2'}`} />
                      <span className={`w-1 bg-teal-400 rounded-full transition-all ${isAiSpeaking ? 'h-8 animate-pulse delay-150' : 'h-2'}`} />
                      <span className={`w-1 bg-teal-400 rounded-full transition-all ${isAiSpeaking ? 'h-5 animate-pulse delay-100' : 'h-2'}`} />
                      <span className={`w-1 bg-teal-400 rounded-full transition-all ${isAiSpeaking ? 'h-3 animate-pulse' : 'h-2'}`} />
                    </div>
                  )}
                </div>
              </div>

              {/* Sample Preset Pills in Target Language */}
              <div className="p-4 bg-slate-100/70 border-b border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Sample Utterances ({currentLangObj.flag} {currentLangObj.label}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {(samplePresetsByLang[selectedLang] || samplePresetsByLang.en).map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendSpeech(preset)}
                      disabled={callStatus !== 'active' || loading}
                      className="bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 text-xs px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-all text-left font-medium disabled:opacity-40"
                    >
                      🗣️ "{preset}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Speech Input Form */}
              <div className="p-4 bg-white space-y-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendSpeech();
                  }}
                  className="flex gap-2"
                >
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={callStatus !== 'active'}
                    className={`p-3 rounded-xl border transition-all ${
                      isListening
                        ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    } disabled:opacity-40`}
                    title={`Microphone input (${currentLangObj.locale})`}
                  >
                    {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={callStatus !== 'active' || loading}
                    placeholder={
                      isListening
                        ? `Listening in ${currentLangObj.label}...`
                        : callStatus === 'active'
                        ? 'Speak or type what you want to say...'
                        : 'Start call to speak...'
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-slate-100"
                  />

                  <button
                    type="submit"
                    disabled={callStatus !== 'active' || !inputText.trim() || loading}
                    className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 flex items-center justify-center shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column: Live Transcript & AI Tool Logs */}
          <div className="lg:col-span-7 space-y-6">
            {/* Transcript Panel */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[480px]">
              <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-400" />
                  <h3 className="font-bold text-base">Live Dialogue Transcript ({currentLangObj.flag})</h3>
                </div>
                <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                  {transcript.length} turns
                </span>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
                {transcript.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8 space-y-3">
                    <Bot className="w-12 h-12 text-slate-300" />
                    <div>
                      <p className="font-semibold text-slate-600">No active call conversation</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Click "Start Web Call" to speak interactively with the multi-lingual AI Agent.
                      </p>
                    </div>
                  </div>
                ) : (
                  transcript.map((turn, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 max-w-[85%] ${
                        turn.speaker === 'patient' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                          turn.speaker === 'patient'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-teal-600 text-white'
                        }`}
                      >
                        {turn.speaker === 'patient' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                      </div>

                      <div>
                        <div
                          className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            turn.speaker === 'patient'
                              ? 'bg-indigo-600 text-white rounded-tr-none'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-line">{turn.text}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block px-1">
                          {turn.speaker === 'patient' ? 'Patient' : 'AI Agent'} • {turn.timestamp}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Executed Tools Inspector */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="bg-slate-900 px-6 py-4 text-white flex items-center gap-2 border-b border-slate-800">
                <Activity className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Executed Tools & API Function Log</h3>
              </div>

              <div className="p-6 space-y-4">
                {toolLogs.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-medium">
                    No backend tool calls executed in current turn.
                  </div>
                ) : (
                  toolLogs.map((tool, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 text-slate-100 rounded-2xl p-4 font-mono text-xs border border-slate-800 space-y-2 shadow-inner"
                    >
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <span className="text-teal-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-teal-400" /> Tool: {tool.name}()
                        </span>
                        <span className="text-slate-500 text-[10px]">SUCCESS</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Args: </span>
                        <span className="text-amber-300">{JSON.stringify(tool.args)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Result: </span>
                        <span className="text-emerald-300">{JSON.stringify(tool.result)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Audit Logs Table */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold">PostgreSQL Call & Reschedule Audit Records</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every AI call, dialogue turn, and reschedule operation is recorded in the database.
              </p>
            </div>
            <button
              onClick={fetchCallLogs}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100 text-slate-700 uppercase text-xs tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold">Call ID</th>
                  <th className="px-6 py-4 font-bold">Patient & Doctor</th>
                  <th className="px-6 py-4 font-bold">Intent</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Turns</th>
                  <th className="px-6 py-4 font-bold">Timestamp</th>
                  <th className="px-6 py-4 font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {callLogsList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-400 font-medium">
                      No call logs found in database.
                    </td>
                  </tr>
                ) : (
                  callLogsList.map((log) => (
                    <tr key={log.logId} className="hover:bg-slate-50/80 transition-all">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-700">
                        {log.callId}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{log.patientName}</div>
                        <div className="text-xs text-slate-500">{log.doctorName} ({log.specialization})</div>
                      </td>
                      <td className="px-6 py-4 uppercase text-xs font-bold tracking-wider text-teal-700">
                        {log.intent || 'GENERAL_QUERY'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            log.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.status === 'IN_PROGRESS'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold">{log.transcript?.length || 0} turns</td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewLogDetail(log.callId)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-1"
                        >
                          View Details <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Outbound Mobile Phone Call Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-indigo-600">PSTN Telephony Service</span>
                <h3 className="text-lg font-bold text-slate-900">Trigger Outbound Mobile Call</h3>
              </div>
              <button
                onClick={() => setShowPhoneModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Target Mobile Phone Number
                </label>
                <input
                  type="text"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                  placeholder="+15550192831 or +919876543210"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Telephony Provider
                </label>
                <select
                  value={telephonyProvider}
                  onChange={(e) => setTelephonyProvider(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="twilio">Twilio Voice API (Real Mobile Call)</option>
                  <option value="vapi">Vapi.ai Realtime Telephony</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Call Language
                </label>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {languageOptions.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {telephonyStatusMsg && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 font-medium flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>{telephonyStatusMsg}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-3 justify-end">
              <button
                onClick={() => setShowPhoneModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerMobileCall}
                disabled={loading || !targetPhone}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Phone className="w-3.5 h-3.5" /> Dispatch Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedCallDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center border-b border-slate-800">
              <div>
                <h3 className="font-bold text-lg">Call Audit Detail: {selectedCallDetail.callId}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Patient: {selectedCallDetail.patientName} | Doctor: {selectedCallDetail.doctorName}
                </p>
              </div>
              <button
                onClick={() => setSelectedCallDetail(null)}
                className="text-slate-400 hover:text-white text-sm font-bold bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-3 uppercase tracking-wider">Event Timeline</h4>
                <div className="space-y-2">
                  {selectedCallDetail.events?.map((evt, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
                      <span className="font-mono font-bold text-teal-800">{evt.eventType}</span>
                      <span className="text-slate-500 ml-auto">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-3 uppercase tracking-wider">Full Call Transcript</h4>
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {selectedCallDetail.transcript?.map((turn, i) => (
                    <div key={i} className="text-xs space-y-1">
                      <span className="font-bold uppercase tracking-wider text-slate-600">
                        {turn.speaker}:
                      </span>
                      <p className="text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200">{turn.message || turn.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
