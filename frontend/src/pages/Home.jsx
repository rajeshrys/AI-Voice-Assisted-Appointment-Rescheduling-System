import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import DoctorCard from '../components/DoctorCard';
import BookingModal from '../components/BookingModal';
import { Search, Stethoscope, ShieldCheck, Clock, CheckCircle, Sparkles, Filter } from 'lucide-react';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [selectedSpec, setSelectedSpec] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchSpecializations();
    fetchDoctors();
  }, [selectedSpec, searchQuery]);

  const fetchSpecializations = async () => {
    try {
      const res = await api.getSpecializations();
      if (res.data.success) {
        setSpecializations(['All', ...res.data.specializations]);
      }
    } catch (err) {
      console.error('Error loading specializations:', err);
    }
  };

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedSpec && selectedSpec !== 'All') params.specialization = selectedSpec;
      if (searchQuery) params.search = searchQuery;

      const res = await api.getDoctors(params);
      if (res.data.success) {
        setDoctors(res.data.doctors);
      }
    } catch (err) {
      console.error('Error loading doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = (doctor) => {
    setSelectedDoctorForBooking(doctor);
  };

  const handleBookingSuccess = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 5000);
  };

  return (
    <div className="min-h-screen pb-20">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Hero Header Section */}
      <section className="relative gradient-hero text-white py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl"></div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-4 h-4" /> Seamless Microservice Healthcare Portal
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Book Top Medical Specialists <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-teal-300 via-sky-300 to-indigo-200 bg-clip-text text-transparent">
              In Seconds, Effortlessly.
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Connect with verified doctors, view real-time availability slots, book appointments, and receive digital prescriptions directly from your personal portal.
          </p>

          {/* Search Box */}
          <div className="mt-8 max-w-2xl mx-auto bg-white p-2 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-100">
            <div className="flex items-center gap-2 pl-3 flex-1">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search by doctor name or medical specialization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2.5 text-sm text-slate-800 focus:outline-none placeholder:text-slate-400 font-medium"
              />
            </div>
            <button
              onClick={fetchDoctors}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Search
            </button>
          </div>

          {/* Highlights */}
          <div className="mt-10 grid grid-cols-3 max-w-xl mx-auto gap-4 text-center border-t border-white/10 pt-6">
            <div>
              <div className="text-2xl font-black text-white">{doctors.length}</div>
              <div className="text-xs text-slate-400">Available Doctors</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white">24/7</div>
              <div className="text-xs text-slate-400">Online Booking</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white">100%</div>
              <div className="text-xs text-slate-400">Verified Specialists</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        
        {/* Specialization Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 custom-scrollbar">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0 mr-2">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {specializations.map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpec(spec)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 ${
                selectedSpec === spec
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>

        {/* Doctor Grid Header */}
        <div className="flex items-center justify-between mt-6 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Featured Specialists</h2>
            <p className="text-xs text-slate-500">
              {selectedSpec !== 'All' ? `Showing ${selectedSpec} specialists` : 'Showing all verified healthcare providers'}
            </p>
          </div>
        </div>

        {/* Doctor List */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-xs font-medium text-slate-500">Fetching doctors from Doctor Microservice...</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 max-w-md mx-auto">
            <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Doctors Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or selecting another specialization filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => (
              <DoctorCard key={doctor.doctor_id} doctor={doctor} onBook={handleBookClick} />
            ))}
          </div>
        )}

      </section>

      {/* Booking Modal */}
      {selectedDoctorForBooking && (
        <BookingModal
          doctor={selectedDoctorForBooking}
          user={user}
          onClose={() => setSelectedDoctorForBooking(null)}
          onSuccess={handleBookingSuccess}
          onRequireLogin={() => {
            setSelectedDoctorForBooking(null);
            navigate('/login');
          }}
        />
      )}

    </div>
  );
};

export default Home;
