import React, { useState } from 'react';
import { X, FileText, CheckCircle, AlertCircle, User, Calendar, Clock } from 'lucide-react';

const PrescriptionModal = ({ appointment, onClose, onSave }) => {
  const [prescription, setPrescription] = useState(appointment.prescription || '');
  const [notes, setNotes] = useState(appointment.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await onSave(appointment.appointment_id, { prescription, notes });
      onClose();
    } catch (err) {
      console.error('Prescription save error:', err);
      setError(err.response?.data?.message || 'Failed to save prescription.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 to-slate-900 p-6 text-white flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-300" />
              <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
                Medical Prescription & Notes
              </span>
            </div>
            <h3 className="text-lg font-bold mt-1">
              Patient: {appointment.patient_first_name} {appointment.patient_last_name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 text-xs text-slate-600 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date: {appointment.appointment_date?.slice(0, 10)}
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Slot: {appointment.time_slot}
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <User className="w-3.5 h-3.5 text-slate-400" /> Age: {appointment.patient_age || 'N/A'} • {appointment.patient_gender || 'N/A'}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Reason for Visit / Patient Complaint
            </label>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 italic">
              {appointment.reason || 'No specific symptoms described.'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Prescription Details (Medications & Dosage)
            </label>
            <textarea
              rows="4"
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              placeholder="e.g. Paracetamol 500mg - 1 tablet twice daily after meals for 5 days..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Clinical Advice / Follow-up Notes
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Advised rest for 3 days, drink plenty of water. Follow-up in 1 week if symptoms persist."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>

          {/* Action Footer */}
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
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save & Complete Appointment'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default PrescriptionModal;
