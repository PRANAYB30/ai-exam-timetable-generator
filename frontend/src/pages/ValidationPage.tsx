import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Calendar,
  Building,
  Users,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Timetable } from '../types';
import { NavTab } from '../components/Sidebar';

interface ValidationPageProps {
  currentTimetable: Timetable | null;
  onNavigate: (tab: NavTab) => void;
}

export const ValidationPage: React.FC<ValidationPageProps> = ({
  currentTimetable,
  onNavigate
}) => {
  if (!currentTimetable) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto mt-12 shadow-sm">
        <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">No Timetable Loaded</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Generate or select a timetable to run the independent audit validator.
        </p>
        <button
          onClick={() => onNavigate('generate')}
          className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
        >
          Generate Timetable
        </button>
      </div>
    );
  }

  const report = currentTimetable.validation_report;
  const hardViolations = report?.hard_violations || [];
  const softWarnings = report?.soft_warnings || [];
  const isValid = hardViolations.length === 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`rounded-2xl p-6 border shadow-sm ${
        isValid
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          : 'bg-rose-50/80 border-rose-200 text-rose-950'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className={`p-3 rounded-xl ${isValid ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'} shadow-sm`}>
              {isValid ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-lg font-bold">
                {isValid ? 'Independent Audit Certified: 100% Conflict-Free' : 'Schedule Hard Conflicts Detected!'}
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                {report?.summary || (isValid ? 'Zero hard-constraint violations found.' : 'Requires correction or AI repair.')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isValid && (
              <button
                onClick={() => onNavigate('viewer')}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
              >
                Resolve Conflicts in Viewer
              </button>
            )}
            <button
              onClick={() => onNavigate('viewer')}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm"
            >
              Open Timetable
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Hard Constraint Clashes</span>
          <p className={`text-2xl font-bold mt-1 ${isValid ? 'text-emerald-600' : 'text-rose-600'}`}>
            {hardViolations.length}
          </p>
          <span className="text-[11px] text-slate-400">Strictly prohibited</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Soft Criteria Warnings</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {softWarnings.length}
          </p>
          <span className="text-[11px] text-slate-400">Permitted but undesirable</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Soft Penalty</span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            {currentTimetable.soft_penalty_total.toFixed(2)} pts
          </p>
          <span className="text-[11px] text-slate-400">Objective score</span>
        </div>
      </div>

      {/* Section 1: Hard Violations (if any) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center">
            <ShieldAlert className="w-4 h-4 text-rose-600 mr-2" />
            Hard Constraint Violations ({hardViolations.length})
          </h2>
          <span className="text-xs text-slate-400">Independent validation audit</span>
        </div>

        {hardViolations.length === 0 ? (
          <div className="p-8 text-center text-slate-600 text-xs flex flex-col items-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
            <p className="font-bold text-sm text-slate-800">All Hard Constraints Satisfied</p>
            <p className="text-slate-400 mt-0.5">
              No student clashes, no room collisions, no capacity breaches, and complete exam coverage.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {hardViolations.map((v, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white uppercase">
                      {v.issue_type}
                    </span>
                    {v.exam_codes && v.exam_codes.length > 0 && (
                      <span className="font-bold text-slate-800">
                        Affected: {v.exam_codes.join(', ')}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-slate-900">{v.description}</p>
                  <p className="text-slate-600 text-[11px] bg-white/70 p-2 rounded-lg border border-rose-100">
                    💡 <span className="font-semibold text-rose-900">Corrective Action:</span> {v.corrective_action}
                  </p>
                </div>

                <button
                  onClick={() => onNavigate('viewer')}
                  className="inline-flex items-center text-xs font-semibold text-rose-700 hover:text-rose-900 shrink-0"
                >
                  Fix in Viewer <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Soft Criteria Warnings */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center">
            <AlertTriangle className="w-4 h-4 text-amber-500 mr-2" />
            Soft Constraint Advisory Warnings ({softWarnings.length})
          </h2>
          <span className="text-xs text-slate-400">Optimization recommendations</span>
        </div>

        {softWarnings.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            No soft penalties incurred. Timetable schedule quality is optimal.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {softWarnings.map((w, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 text-xs flex items-start space-x-2.5"
              >
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-800">{w.description}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{w.corrective_action}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
