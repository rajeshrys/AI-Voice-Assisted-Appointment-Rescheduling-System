import React from 'react';
import { Calendar, Award, DollarSign, Clock, CheckCircle2, UserCheck } from 'lucide-react';

const DoctorCard = ({ doctor, onBook }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group">
      <div>
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-teal-700 to-sky-700 px-6 py-4 text-white flex justify-between items-center">
          <span className="text-xs uppercase tracking-wider font-semibold bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-xs">
            {doctor.specialization}
          </span>
          <span className="text-xs font-medium flex items-center gap-1 bg-teal-900/40 px-2 py-0.5 rounded">
            <Award className="w-3.5 h-3.5 text-amber-300" /> {doctor.experience_years} Yrs Exp.
          </span>
        </div>

        {/* Card Body */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold text-xl shrink-0 group-hover:scale-105 transition-transform">
              {doctor.first_name[0]}{doctor.last_name[0]}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                Dr. {doctor.first_name} {doctor.last_name}
              </h3>
              <p className="text-xs font-medium text-slate-500">{doctor.qualification}</p>
              <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Verified Practitioner
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {doctor.bio || 'Experienced medical professional committed to providing personalized patient care.'}
          </p>

          <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Availability:
              </span>
              <span className="font-semibold text-slate-700">{doctor.available_days}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Hours:
              </span>
              <span className="font-semibold text-slate-700">
                {doctor.start_time?.slice(0, 5)} - {doctor.end_time?.slice(0, 5)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-500 block">Consultation Fee</span>
          <span className="text-lg font-bold text-slate-900 flex items-center">
            <DollarSign className="w-4 h-4 text-emerald-600 -mr-0.5" />
            {parseFloat(doctor.consultation_fee).toFixed(2)}
          </span>
        </div>

        <button
          onClick={() => onBook(doctor)}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-xs hover:shadow transition-all cursor-pointer"
        >
          <UserCheck className="w-4 h-4" /> Book Appointment
        </button>
      </div>
    </div>
  );
};

export default DoctorCard;
