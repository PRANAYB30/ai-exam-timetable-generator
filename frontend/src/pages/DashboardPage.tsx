import React from 'react';
import {
  BookOpen,
  Building2,
  CalendarDays,
  ShieldCheck,
  ShieldAlert,
  Percent,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { DashboardStats, Timetable } from '../types';
import { NavTab } from '../components/Sidebar';

interface DashboardPageProps {
  stats: DashboardStats | null;
  loading: boolean;
  onNavigate: (tab: NavTab) => void;
  onSelectTimetable?: (tt: Timetable) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  loading,
  onNavigate,
  onSelectTimetable
}) => {
  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const latest = stats.latest_timetable;
  const isAuditedValid = stats.hard_violations === 0 && stats.scheduled_exams > 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full mb-2">
            PBL-I Project Demonstration
          </span>
          <h1 className="text-2xl font-bold tracking-tight">AI Exam Timetable Control Center</h1>
          <p className="text-sm text-slate-300 mt-1">
            Automated conflict-free scheduling engine with CSP backtracking, MRV heuristics, and soft penalty optimization.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => onNavigate('generate')}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Timetable
          </button>
          <button
            onClick={() => onNavigate('viewer')}
            className="inline-flex items-center px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            <CalendarDays className="w-4 h-4 mr-1.5" />
            View Timetable
          </button>
          <button
            onClick={() => onNavigate('validation')}
            className="inline-flex items-center px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            Conflict Audit
          </button>
        </div>
      </div>

      {/* Primary 6 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Exams"
          value={stats.total_exams}
          subtitle="Configured courses"
          icon={BookOpen}
          color="indigo"
        />
        <StatCard
          title="Scheduled"
          value={stats.scheduled_exams}
          subtitle={`${stats.total_exams > 0 ? Math.round((stats.scheduled_exams / stats.total_exams) * 100) : 0}% scheduled`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Active Rooms"
          value={stats.available_rooms}
          subtitle="Halls, labs & auds"
          icon={Building2}
          color="slate"
        />
        <StatCard
          title="Exam Days"
          value={stats.examination_days}
          subtitle="Available window"
          icon={CalendarDays}
          color="indigo"
        />
        <StatCard
          title="Hard Violations"
          value={stats.hard_violations}
          subtitle={stats.hard_violations === 0 ? "100% Conflict-free" : "Audit detected clashes"}
          icon={stats.hard_violations === 0 ? ShieldCheck : ShieldAlert}
          color={stats.hard_violations === 0 ? "emerald" : "rose"}
          badge={stats.hard_violations === 0 ? "PASSED" : "CLASH"}
        />
        <StatCard
          title="Room Utilization"
          value={`${stats.room_utilization_percent}%`}
          subtitle="Seat allocation ratio"
          icon={Percent}
          color={stats.room_utilization_percent > 65 ? "emerald" : "amber"}
        />
      </div>

      {/* Main Content Split: Latest Timetable & Quick Actions / Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Timetable Status Card (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Latest Timetable Status</h2>
              <p className="text-xs text-slate-500 mt-0.5">Most recent execution of the CSP scheduling engine</p>
            </div>
            {latest && (
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                latest.is_valid
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {latest.status}
              </span>
            )}
          </div>

          {latest ? (
            <div className="mt-5 space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{latest.title}</h3>
                    <p className="text-xs text-slate-500 flex items-center mt-0.5">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      Generated: {new Date(latest.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Soft Penalty</span>
                    <p className="text-lg font-bold text-indigo-600">{latest.soft_penalty_total.toFixed(2)}</p>
                  </div>
                </div>

                {/* Algorithmic Decision Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400">Search Duration</span>
                    <p className="font-semibold text-slate-800">{latest.metrics.search_duration_seconds ?? 0}s</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Search Nodes</span>
                    <p className="font-semibold text-slate-800">{latest.metrics.nodes_explored ?? 0}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Backtracks</span>
                    <p className="font-semibold text-slate-800">{latest.metrics.backtracks ?? 0}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Constraint Checks</span>
                    <p className="font-semibold text-slate-800">{latest.metrics.constraint_checks ?? 0}</p>
                  </div>
                </div>
              </div>

              {/* Validation Badge & Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center text-xs">
                  {latest.is_valid ? (
                    <span className="flex items-center text-emerald-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                      Hard Constraints Passed (0 Conflicts)
                    </span>
                  ) : (
                    <span className="flex items-center text-rose-700 font-medium">
                      <AlertTriangle className="w-4 h-4 mr-1 text-rose-600" />
                      Violations present (Requires manual fix or AI repair)
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      if (onSelectTimetable) onSelectTimetable(latest);
                      onNavigate('viewer');
                    }}
                    className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Open in Viewer <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 text-center py-10">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No timetable generated yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Click below to launch the Constraint Satisfaction Engine and generate the first schedule.
              </p>
              <button
                onClick={() => onNavigate('generate')}
                className="mt-4 inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Generate Timetable Now
              </button>
            </div>
          )}
        </div>

        {/* Quick Management Shortcuts & Activity (1 Col) */}
        <div className="space-y-6">
          {/* Quick Management Nav */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Quick Navigation</h3>
            <div className="space-y-2">
              <button
                onClick={() => onNavigate('exams')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors text-xs font-medium text-slate-700"
              >
                <span className="flex items-center">
                  <BookOpen className="w-4 h-4 text-indigo-600 mr-2" />
                  Manage Examinations ({stats.total_exams})
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('rooms')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors text-xs font-medium text-slate-700"
              >
                <span className="flex items-center">
                  <Building2 className="w-4 h-4 text-indigo-600 mr-2" />
                  Manage Rooms & Labs ({stats.available_rooms})
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('config')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors text-xs font-medium text-slate-700"
              >
                <span className="flex items-center">
                  <CalendarDays className="w-4 h-4 text-indigo-600 mr-2" />
                  Configure Dates & Weights
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Recent History */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <History className="w-4 h-4 mr-1.5 text-slate-500" />
                Recent Runs
              </h3>
            </div>
            {stats.recent_activities.length > 0 ? (
              <div className="space-y-2.5">
                {stats.recent_activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{act.title}</p>
                      <span className="text-[10px] text-slate-500">
                        {act.created_at ? new Date(act.created_at).toLocaleDateString() : ''} • Penalty: {act.penalty.toFixed(1)}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      act.is_valid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {act.is_valid ? 'VALID' : 'CLASH'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No previous runs recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
