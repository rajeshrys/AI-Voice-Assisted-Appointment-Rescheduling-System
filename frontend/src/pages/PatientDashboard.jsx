import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, User, Phone, Stethoscope, AlertCircle, CheckCircle2, XCircle, FileText, CheckCircle } from 'lucide-react';

const PatientDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.getPatientAppointments();
      if (res.data.success) {
        setAppointments(res.data.appointments);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const res = await api.cancelAppointment(id);
      if (res.data.success) {
        showToast('Appointment cancelled successfully.');
        fetchAppointments();
      }
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      alert(err.response?.data?.message || 'Failed to cancel appointment.');
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Confirmed</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-xs font-bold bg-rose-100 text-rose-800 rounded-full flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-full flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Scheduled</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[85vh]">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Patient Profile Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 border-2 border-teal-400 flex items-center justify-center font-bold text-2xl shadow-inner">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-teal-300">Patient Dashboard</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold">{user?.first_name} {user?.last_name}</h1>
            <p className="text-xs text-slate-300 mt-1">{user?.email} • {user?.phone || 'No phone provided'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/15 text-xs text-slate-200">
          <div>
            <span className="block text-slate-400">Blood Group</span>
            <span className="font-bold text-white text-sm">{user?.blood_group || 'N/A'}</span>
          </div>
          <div className="border-l border-white/20 pl-4">
            <span className="block text-slate-400">Age</span>
            <span className="font-bold text-white text-sm">{user?.age || 'N/A'} Yrs</span>
          </div>
          <div className="border-l border-white/20 pl-4">
            <span className="block text-slate-400">Appointments</span>
            <span className="font-bold text-teal-300 text-sm">{appointments.length} Total</span>
          </div>
        </div>
      </div>

      {/* Appointments Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Your Appointments</h2>
            <p className="text-xs text-slate-500">Track and manage your upcoming & past consultations</p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-xs font-medium text-slate-500">Fetching your appointments...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 max-w-md mx-auto">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Appointments Booked</h3>
            <p className="text-xs text-slate-500 mt-1">You haven't scheduled any doctor appointments yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {appointments.map((appt) => (
              <div key={appt.appointment_id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between hover:shadow-md transition-all">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg">
                        <Stethoscope className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">
                          Dr. {appt.doctor_first_name} {appt.doctor_last_name}
                        </h3>
                        <p className="text-xs font-medium text-teal-600">{appt.specialization}</p>
                      </div>
                    </div>
                    {getStatusBadge(appt.status)}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-slate-500">
                        <Calendar className="w-4 h-4 text-slate-400" /> Date:
                      </span>
                      <span className="font-bold text-slate-800">{appt.appointment_date?.slice(0, 10)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-slate-500">
                        <Clock className="w-4 h-4 text-slate-400" /> Time Slot:
                      </span>
                      <span className="font-bold text-slate-800">{appt.time_slot}</span>
                    </div>
                    {appt.reason && (
                      <div className="mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-600 italic">
                        " {appt.reason} "
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  {appt.prescription ? (
                    <button
                      onClick={() => setSelectedPrescription(appt)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4" /> View Prescription
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No prescription attached</span>
                  )}

                  <div className="flex items-center gap-2">
                    {appt.status !== 'CANCELLED' && appt.status !== 'COMPLETED' && (
                      <>
                        <a
                          href={`/voice-dashboard?appointmentId=${appt.appointment_id}`}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-lg shadow-sm transition-all"
                        >
                          <Phone className="w-3.5 h-3.5" /> AI Voice Reschedule
                        </a>
                        <button
                          onClick={() => handleCancel(appt.appointment_id)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>


              </div>
            ))}
          </div>
        )}

      </div>

      {/* Prescription View Modal */}
      {selectedPrescription && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-teal-600">Digital Prescription</span>
                <h3 className="text-lg font-bold text-slate-900">Dr. {selectedPrescription.doctor_first_name} {selectedPrescription.doctor_last_name}</h3>
                <p className="text-xs text-slate-500">{selectedPrescription.specialization}</p>
              </div>
              <button
                onClick={() => setSelectedPrescription(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Prescribed Medication & Dosage
              </label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-wrap">
                {selectedPrescription.prescription}
              </div>
            </div>

            {selectedPrescription.notes && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Doctor's Notes & Advice
                </label>
                <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-xs text-teal-900">
                  {selectedPrescription.notes}
                </div>
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedPrescription(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PatientDashboard;
