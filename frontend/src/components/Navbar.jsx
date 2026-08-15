import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, User, LogOut, Calendar, Home, ShieldCheck } from 'lucide-react';

const Navbar = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md group-hover:bg-teal-700 transition-colors">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 via-teal-800 to-teal-600 bg-clip-text text-transparent">
                CarePulse
              </span>
              <span className="hidden sm:inline-block text-xs font-semibold text-teal-600 ml-1 px-1.5 py-0.5 bg-teal-50 rounded">
                HMS
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2 sm:gap-6">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-teal-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Find Doctors</span>
            </Link>

            {user ? (
              <>
                {role === 'patient' && (
                  <Link
                    to="/patient-dashboard"
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-teal-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-all"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>My Appointments</span>
                  </Link>
                )}

                {role === 'doctor' && (
                  <Link
                    to="/doctor-dashboard"
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-teal-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-all"
                  >
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <span>Doctor Dashboard</span>
                  </Link>
                )}

                {/* User Profile Badge */}
                <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                  <div className="flex flex-col text-right hidden md:block">
                    <span className="text-sm font-semibold text-slate-800">
                      Dr. {user.first_name} {user.last_name}
                    </span>
                    <span className="text-xs text-teal-600 capitalize font-medium">
                      {role === 'doctor' ? `Doctor (${user.specialization})` : 'Patient'}
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    title="Logout"
                    className="flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-700 hover:text-teal-600 px-3.5 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg shadow-xs transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
