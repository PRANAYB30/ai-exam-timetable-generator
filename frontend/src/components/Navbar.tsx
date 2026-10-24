import React, { useState } from 'react';
import { Calendar, RefreshCw, Cpu, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

interface NavbarProps {
  onRefresh: () => void;
  activeTimetableValid?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onRefresh, activeTimetableValid }) => {
  const [resetting, setResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleResetDemo = async () => {
    try {
      setResetting(true);
      await api.resetDemoData();
      setShowConfirm(false);
      onRefresh();
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">AutoExam CSP</span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                  PBL-I
                </span>
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  <Cpu className="w-3 h-3 mr-1 text-emerald-600" /> AI Engine Active
                </span>
              </div>
              <p className="text-xs text-slate-500">Autonomous Constraint Satisfaction Examination Scheduler</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-3">
            {activeTimetableValid !== undefined && (
              <div className="hidden md:flex items-center text-xs font-medium px-2.5 py-1 rounded-md border">
                {activeTimetableValid ? (
                  <span className="text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Audit: 0 Conflicts
                  </span>
                ) : (
                  <span className="text-rose-700 bg-rose-50 border-rose-200 flex items-center">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" /> Conflicts Flagged
                  </span>
                )}
              </div>
            )}

            <button
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors shadow-sm"
              title="Reset database to curated sample dataset"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${resetting ? 'animate-spin' : ''}`} />
              Reset Demo Data
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in duration-200">
            <h3 className="text-base font-semibold text-slate-900 flex items-center">
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
              Reset to Academic Demo Data?
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              This will reseed all examinations, rooms, student groups, and scheduling slots with the benchmark engineering department dataset. Any generated timetables will be cleared.
            </p>
            <div className="mt-5 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetDemo}
                className="px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm flex items-center"
                disabled={resetting}
              >
                {resetting && <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
