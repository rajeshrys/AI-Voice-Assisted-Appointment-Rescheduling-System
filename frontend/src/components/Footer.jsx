import React from 'react';
import { Stethoscope, Heart, Shield } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">CarePulse HMS</span>
              <p className="text-xs text-slate-400">Microservice-powered healthcare & appointment system</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-teal-400" /> Secure Data
            </span>
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-400" /> Patient First
            </span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} CarePulse Healthcare Systems. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
