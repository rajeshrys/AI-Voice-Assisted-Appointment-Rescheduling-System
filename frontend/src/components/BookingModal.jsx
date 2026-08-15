import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { X, Calendar, Clock, AlertCircle, CheckCircle, Stethoscope, DollarSign } from 'lucide-react';

const TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
];

const BookingModal = ({ doctor, onClose, onSuccess, user, onRequireLogin }) => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (doctor && selectedDate) {
      fetchBookedSlots();
    }
  }, [doctor, selectedDate]);

  const fetchBookedSlots = async () => {
    setLoadingSlots(true);
    setSelectedSlot('');
    try {
      const res = await api.getBookedSlots(doctor.doctor_id, selectedDate);
      if (res.data.success) {
        setBookedSlots(res.data.bookedSlots || []);
      }
    } catch (err) {
      console.error('Error fetching booked slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!user) {
      onRequireLogin();
      return;
    }

    if (!selectedDate || !selectedSlot) {
      setErrorMsg('Please select a date and an available time slot.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.bookAppointment({
        doctor_id: doctor.doctor_id,
        appointment_date: selectedDate,
        time_slot: selectedSlot,
        reason,
      });

      if (res.data.success) {
        onSuccess(res.data.message || 'Appointment booked successfully!');
        onClose();
      }
    } catch (err) {
      console.error('Booking error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to book appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 to-sky-700 p-6 text-white flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-200" />
              <span className="text-xs uppercase font-bold tracking-wider text-teal-100">
                Schedule Appointment
              </span>
            </div>
            <h2 className="text-xl font-bold mt-1">Dr. {doctor.first_name} {doctor.last_name}</h2>
            <p className="text-xs text-teal-100 mt-0.5">{doctor.specialization} • Fee: ${parseFloat(doctor.consultation_fee).toFixed(2)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Select Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="date"
                min={today}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Time Slot Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              2. Select Available Time Slot
            </label>
            {loadingSlots ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading available slots...</div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const isBooked = bookedSlots.includes(slot);
                  const isSelected = selectedSlot === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isBooked}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        isBooked
                          ? 'bg-slate-100 border-slate-200 text-slate-400 line-through cursor-not-allowed'
                          : isSelected
                          ? 'bg-teal-600 border-teal-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-teal-50'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reason for Visit */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              3. Reason for Visit / Symptoms (Optional)
            </label>
            <textarea
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe your symptoms or reason for appointment..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {submitting ? 'Confirming...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default BookingModal;
