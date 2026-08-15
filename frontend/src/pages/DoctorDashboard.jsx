import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PrescriptionModal from '../components/PrescriptionModal';
import { ShieldCheck, Calendar, Clock, User, Phone, CheckCircle2, FileText, AlertCircle, XCircle, DollarSign } from 'lucide-react';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePrescriptionAppt, setActivePrescriptionAppt] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    fetchDoctorAppointments();
  }, []);

  const fetchDoctorAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.getDoctorAppointments();
      if (res.data.success) {
        setAppointments(res.data.appointments);
      }
    } catch (err) {
      console.error('Error fetching doctor appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await api.updateAppointmentStatus(id, newStatus);
      if (res.data.success) {
        showToast(`Appointment status updated to ${newStatus}`);
        fetchDoctorAppointments();
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleSavePrescription = async (id, data) => {
    const res = await api.updatePrescription(id, data);
    if (res.data.success) {
      showToast('Prescription saved and appointment completed.');
      fetchDoctorAppointments();
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Metrics calculation
  const totalAppts = appointments.length;
  const scheduledCount = appointments.filter((a) => a.status === 'SCHEDULED').length;
  const confirmedCount = appointments.filter((a) => a.status === 'CONFIRMED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[85vh]">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Doctor Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-sky-900 rounded-3xl p-8 text-white shadow-xl mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 border-2 border-teal-400 flex items-center justify-center font-bold text-2xl shadow-inner">
            Dr
          </div>
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-300" />
              <span className="text-xs uppercase font-bold tracking-widest text-teal-300">Doctor Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">Dr. {user?.first_name} {user?.last_name}</h1>
            <p className="text-xs text-slate-300 mt-1">{user?.specialization} • {user?.qualification} • Fee: ${parseFloat(user?.consultation_fee || 500).toFixed(2)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/15 text-xs text-slate-200">
          <div>
            <span className="block text-slate-400">Available Days</span>
            <span className="font-bold text-white text-sm">{user?.available_days?.split(',')[0]} - {user?.available_days?.split(',').slice(-1)}</span>
          </div>
          <div className="border-l border-white/20 pl-4">
            <span className="block text-slate-400">Hours</span>
            <span className="font-bold text-teal-300 text-sm">{user?.start_time?.slice(0,5)} - {user?.end_time?.slice(0,5)}</span>
          </div>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Patients</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalAppts}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-amber-200/70 bg-amber-50/20 shadow-xs">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Scheduled</span>
          <div className="text-2xl font-black text-amber-800 mt-1">{scheduledCount}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-emerald-200/70 bg-emerald-50/20 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Confirmed</span>
          <div className="text-2xl font-black text-emerald-800 mt-1">{confirmedCount}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-blue-200/70 bg-blue-50/20 shadow-xs">
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Completed</span>
          <div className="text-2xl font-black text-blue-800 mt-1">{completedCount}</div>
        </div>
      </div>

      {/* Patient Appointments Management Table */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Patient Consultation Schedule</h2>
            <p className="text-xs text-slate-500">Manage patient statuses, review symptoms, and issue prescriptions</p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-xs font-medium text-slate-500">Loading patient schedule from Appointment Service...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 max-w-md mx-auto">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Patient Appointments</h3>
            <p className="text-xs text-slate-500 mt-1">There are currently no patient appointments booked with you.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold tracking-wider">
                    <th className="py-4 px-6">Patient</th>
                    <th className="py-4 px-6">Date & Slot</th>
                    <th className="py-4 px-6">Reason / Symptoms</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {appointments.map((appt) => (
                    <tr key={appt.appointment_id} className="hover:bg-slate-50/80 transition-colors">
                      
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm">
                          {appt.patient_first_name} {appt.patient_last_name}
                        </div>
                        <div className="text-slate-500 text-xs mt-0.5">
                          {appt.patient_email} • {appt.patient_phone || 'No phone'}
                        </div>
                        <div className="text-slate-400 text-xs">
                          Age: {appt.patient_age || 'N/A'} • Blood: {appt.patient_blood_group || 'N/A'}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {appt.appointment_date?.slice(0, 10)}
                        </div>
                        <div className="text-teal-600 font-semibold mt-0.5 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {appt.time_slot}
                        </div>
                      </td>

                      <td className="py-4 px-6 max-w-xs">
                        <p className="text-slate-700 italic line-clamp-2">
                          {appt.reason || 'No description provided.'}
                        </p>
                      </td>

                      <td className="py-4 px-6">
                        <select
                          value={appt.status}
                          onChange={(e) => handleStatusChange(appt.appointment_id, e.target.value)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                        >
                          <option value="SCHEDULED">SCHEDULED</option>
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </td>

                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => setActivePrescriptionAppt(appt)}
                          className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {appt.prescription ? 'Edit Prescription' : 'Prescribe'}
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Prescription Modal */}
      {activePrescriptionAppt && (
        <PrescriptionModal
          appointment={activePrescriptionAppt}
          onClose={() => setActivePrescriptionAppt(null)}
          onSave={handleSavePrescription}
        />
      )}

    </div>
  );
};

export default DoctorDashboard;
