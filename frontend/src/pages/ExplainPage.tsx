import React, { useState } from 'react';
import {
  BarChart3,
  Cpu,
  Sparkles,
  GitCommit,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingDown,
  Layers,
  Search,
  Filter
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Timetable } from '../types';

interface ExplainPageProps {
  currentTimetable: Timetable | null;
}

export const ExplainPage: React.FC<ExplainPageProps> = ({ currentTimetable }) => {
  const [filterEventType, setFilterEventType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  if (!currentTimetable) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto mt-12 shadow-sm">
        <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">No Timetable Selected</h2>
        <p className="text-xs text-slate-500 mt-1">
          Generate a timetable first to review AI decision explainability and CSP search statistics.
        </p>
      </div>
    );
  }

  const assignments = currentTimetable.assignments || [];
  const explanations = currentTimetable.explanations || [];
  const metrics = currentTimetable.metrics || {};
  const softScores = currentTimetable.soft_scores || {};

  // 1. Chart Data: Exams per Day
  const dayCountsMap: Record<string, number> = {};
  for (const a of assignments) {
    dayCountsMap[a.date] = (dayCountsMap[a.date] || 0) + 1;
  }
  const examsPerDayData = Object.keys(dayCountsMap)
    .sort()
    .map((date) => ({
      date: date.substring(5), // MM-DD
      fullDate: date,
      examinations: dayCountsMap[date]
    }));

  // 2. Chart Data: Room Usage vs Capacity
  const roomCountsMap: Record<string, { count: number; name: string; capacity: number }> = {};
  for (const a of assignments) {
    if (!roomCountsMap[a.room_name]) {
      roomCountsMap[a.room_name] = { count: 0, name: a.room_name, capacity: a.room_capacity };
    }
    roomCountsMap[a.room_name].count += 1;
  }
  const roomUsageData = Object.values(roomCountsMap).map((r) => ({
    name: r.name.length > 15 ? r.name.substring(0, 15) + '...' : r.name,
    sessions: r.count,
    capacity: r.capacity
  }));

  // 3. Chart Data: Soft Penalty Breakdown Pie
  const penaltyPieData = [
    { name: 'Consecutive Slots', value: softScores.consecutive_exam_penalty || 0, color: '#f59e0b' },
    { name: 'Same-Day Multiple', value: softScores.same_day_multiple_exam_penalty || 0, color: '#ef4444' },
    { name: 'Gap Deficit', value: softScores.insufficient_gap_penalty || 0, color: '#8b5cf6' },
    { name: 'Day Imbalance', value: softScores.day_concentration_penalty || 0, color: '#06b6d4' },
    { name: 'Room Utilization', value: softScores.room_utilization_penalty || 0, color: '#3b82f6' }
  ].filter((p) => p.value > 0);

  // Filter explanations
  const filteredEvents = explanations.filter((ev) => {
    const matchType = !filterEventType || ev.event_type === filterEventType;
    const matchSearch =
      ev.exam_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center">
          <Cpu className="w-5 h-5 text-indigo-600 mr-2" />
          AI Explainability & Algorithmic Decision Analytics
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Auditable tracing of Constraint Satisfaction Search, MRV heuristics, Forward Checking domain prunings, and soft penalty optimization.
        </p>
      </div>

      {/* Algorithmic Decision Justification Card (Viva-Ready) */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold tracking-tight">Algorithmic Defense & Viva Justification</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 space-y-1">
            <span className="font-bold text-indigo-300 flex items-center">
              1. MRV & Degree Selection
            </span>
            <p className="text-[11px] leading-relaxed text-slate-200">
              The engine prioritized variables with minimum remaining values (MRV) and largest conflict degree, guaranteeing that bottleneck exams (like high-enrollment or lab exams) were assigned before options became constrained.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 space-y-1">
            <span className="font-bold text-indigo-300 flex items-center">
              2. Least Constraining Value (LCV)
            </span>
            <p className="text-[11px] leading-relaxed text-slate-200">
              Time slots and halls were dynamically evaluated to prefer values that rule out the fewest candidate choices for unassigned neighbors, maximizing the probability of finding a conflict-free solution without deep backtracking.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 space-y-1">
            <span className="font-bold text-indigo-300 flex items-center">
              3. Forward Checking & Optimization
            </span>
            <p className="text-[11px] leading-relaxed text-slate-200">
              Forward checking pruned conflicting values after each assignment. Once a feasible schedule was secured, branch-and-bound explored alternatives to minimize consecutive papers and optimize room occupancy.
            </p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Examinations per Day */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Examination Distribution by Date
            </h3>
            <span className="text-[11px] text-slate-500">Institutional load balance</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={examsPerDayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="examinations" fill="#6366f1" radius={[4, 4, 0, 0]} name="Exams Scheduled" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Room Usage vs Capacity */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Exam Hall Allocation Count
            </h3>
            <span className="text-[11px] text-slate-500">Sessions hosted per room</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roomUsageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="sessions" fill="#10b981" radius={[4, 4, 0, 0]} name="Exam Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Real Decision Event Log */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center">
              <History className="w-4 h-4 text-indigo-600 mr-2" />
              Real Algorithmic Decision Log ({filteredEvents.length} events recorded)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live chronological trace of variable selection, value ordering, forward checking prunes, and backtracks.
            </p>
          </div>

          {/* Event Filter */}
          <div className="flex items-center space-x-2 text-xs">
            <select
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              className="py-1 px-2 border border-slate-300 rounded-lg bg-white text-xs"
            >
              <option value="">All Event Types</option>
              <option value="VARIABLE_SELECTION">Variable Selection (MRV/Degree)</option>
              <option value="ASSIGNMENT">Assignment (LCV)</option>
              <option value="PRUNED">Forward Checking Pruning</option>
              <option value="BACKTRACK">Backtracking</option>
              <option value="SOLUTION_FOUND">Solution Found</option>
            </select>
          </div>
        </div>

        {/* Event List Table */}
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs">
          {filteredEvents.length === 0 ? (
            <p className="text-center py-6 text-slate-400">No events match the filter.</p>
          ) : (
            filteredEvents.map((ev, i) => (
              <div key={i} className="py-2.5 flex items-start space-x-3 hover:bg-slate-50/70 transition-colors">
                <span className="font-mono text-[10px] text-slate-400 font-bold shrink-0 w-8 pt-0.5">
                  #{ev.step}
                </span>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                  ev.event_type === 'VARIABLE_SELECTION'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : ev.event_type === 'ASSIGNMENT'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : ev.event_type === 'BACKTRACK'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : ev.event_type === 'PRUNED'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}>
                  {ev.event_type.replace('_', ' ')}
                </span>

                <div className="flex-1">
                  <div className="flex items-center space-x-2 font-semibold text-slate-800">
                    {ev.exam_code && <span className="text-indigo-600">{ev.exam_code}</span>}
                    <span>{ev.details}</span>
                  </div>
                  {ev.reason && (
                    <p className="text-[11px] text-slate-500 mt-0.5 font-sans">
                      {ev.reason}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
