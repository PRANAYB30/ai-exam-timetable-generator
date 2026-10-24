import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Table as TableIcon,
  LayoutGrid,
  Building,
  Users,
  Download,
  Printer,
  Lock,
  Unlock,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { Timetable, Assignment, Room, TimeSlot } from '../types';
import { Modal } from '../components/Modal';

interface TimetableViewerPageProps {
  currentTimetable: Timetable | null;
  onTimetableUpdated: (tt: Timetable) => void;
}

type ViewMode = 'grid' | 'table' | 'room' | 'group';

export const TimetableViewerPage: React.FC<TimetableViewerPageProps> = ({
  currentTimetable,
  onTimetableUpdated
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterGroup, setFilterGroup] = useState('');

  // Manual Edit Modal State
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    date: '',
    slot_id: '',
    room_id: '',
    is_locked: false
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  useEffect(() => {
    const fetchPrereqs = async () => {
      try {
        const [rData, sData, cData] = await Promise.all([
          api.getRooms(),
          api.getSlots(),
          api.getConfig()
        ]);
        setRooms(rData);
        setSlots(sData);
        setAvailableDates(cData.available_dates);
      } catch (err: any) {
        console.error(err);
      }
    };
    fetchPrereqs();
  }, []);

  if (!currentTimetable) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto mt-12 shadow-sm">
        <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">No Generated Timetable Selected</h2>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          Please run the AI Timetable Generator or select a previous run from the Dashboard.
        </p>
      </div>
    );
  }

  const assignments = currentTimetable.assignments || [];

  // Filtered assignments
  const filteredAssignments = assignments.filter((a) => {
    const matchSearch =
      a.exam_code.toLowerCase().includes(search.toLowerCase()) ||
      a.exam_name.toLowerCase().includes(search.toLowerCase()) ||
      a.groups_str.toLowerCase().includes(search.toLowerCase());
    const matchDate = !filterDate || a.date === filterDate;
    const matchRoom = !filterRoom || a.room_id === filterRoom;
    const matchGroup = !filterGroup || a.groups_str.includes(filterGroup);
    return matchSearch && matchDate && matchRoom && matchGroup;
  });

  // Extract unique dates from assignments
  const timetableDates = Array.from(new Set(assignments.map((a) => a.date))).sort();

  // Export CSV
  const handleExportCSV = () => {
    window.open(`/api/timetables/${currentTimetable.id}/export`, '_blank');
  };

  // Printable View
  const handlePrint = () => {
    window.print();
  };

  // Open Edit Modal
  const openEditModal = (asgn: Assignment) => {
    setEditingAssignment(asgn);
    setEditForm({
      date: asgn.date,
      slot_id: asgn.slot_id,
      room_id: asgn.room_id,
      is_locked: asgn.is_locked
    });
    setIsEditModalOpen(true);
  };

  // Save manual edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;
    try {
      setIsUpdating(true);
      const updated = await api.updateAssignment(
        currentTimetable.id,
        editingAssignment.id,
        editForm
      );
      onTimetableUpdated(updated);
      setIsEditModalOpen(false);
    } catch (err: any) {
      alert(`Manual update error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // AI Repair
  const handleAIRepair = async () => {
    if (!window.confirm('AI Repair will keep all locked assignments and re-solve any remaining conflicts with CSP search. Proceed?')) {
      return;
    }
    try {
      setIsRepairing(true);
      const repaired = await api.repairTimetable(currentTimetable.id);
      onTimetableUpdated(repaired);
    } catch (err: any) {
      alert(`AI Repair error: ${err.message}`);
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900">{currentTimetable.title}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
              currentTimetable.is_valid
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {currentTimetable.is_valid ? 'CERTIFIED CONFLICT-FREE' : 'HARD CONFLICTS DETECTED'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {assignments.length} scheduled sessions • Penalty score: {currentTimetable.soft_penalty_total.toFixed(2)} pts
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!currentTimetable.is_valid && (
            <button
              onClick={handleAIRepair}
              disabled={isRepairing}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
              title="Re-run CSP engine preserving locked assignments"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              {isRepairing ? 'Repairing...' : 'AI Repair Schedule'}
            </button>
          )}

          {/* View Mode Toggle Buttons */}
          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1" /> Grid Matrix
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 mr-1" /> Table List
            </button>
            <button
              onClick={() => setViewMode('room')}
              className={`inline-flex items-center px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'room' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Building className="w-3.5 h-3.5 mr-1" /> Room-wise
            </button>
            <button
              onClick={() => setViewMode('group')}
              className={`inline-flex items-center px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'group' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5 mr-1" /> Cohort-wise
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search code, course, or group..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <div className="flex items-center space-x-1">
            <span>Date:</span>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="py-1 px-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">All Dates</option>
              {timetableDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <span>Room:</span>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="py-1 px-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">All Rooms</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: MATRIX / GRID VIEW (Date x Slot Matrix) */}
      {viewMode === 'grid' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="min-w-[800px] p-4">
            <div className="grid grid-cols-1 divide-y divide-slate-200">
              {timetableDates
                .filter((d) => !filterDate || d === filterDate)
                .map((dateStr) => {
                  const dayAssignments = filteredAssignments.filter((a) => a.date === dateStr);
                  return (
                    <div key={dateStr} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
                          📅 {new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {dayAssignments.length} examinations scheduled
                        </span>
                      </div>

                      {/* Slots for this day */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                        {slots.map((s) => {
                          const slotExams = dayAssignments.filter((a) => a.slot_id === s.id);
                          return (
                            <div
                              key={s.id}
                              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-col justify-between"
                            >
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
                                <span className="font-bold text-xs text-indigo-700">{s.name}</span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {s.start_time} — {s.end_time}
                                </span>
                              </div>

                              {slotExams.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-3 text-center">
                                  No examinations scheduled
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {slotExams.map((asgn) => (
                                    <div
                                      key={asgn.id}
                                      onClick={() => openEditModal(asgn)}
                                      className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow transition-all cursor-pointer group"
                                    >
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <div className="flex items-center space-x-1.5">
                                            <span className="font-bold text-xs text-indigo-600">
                                              {asgn.exam_code}
                                            </span>
                                            {asgn.is_locked && (
                                              <span title="Locked Assignment">
                                                <Lock className="w-3 h-3 text-amber-500" />
                                              </span>
                                            )}
                                          </div>
                                          <h4 className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                            {asgn.exam_name}
                                          </h4>
                                        </div>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                          {asgn.student_count} seats
                                        </span>
                                      </div>

                                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                        <span className="flex items-center font-medium text-slate-700">
                                          🏛️ {asgn.room_name}
                                        </span>
                                        <span className="text-indigo-600 font-medium">
                                          {asgn.groups_str}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TABLE LIST VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Time Slot</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Student Groups</th>
                  <th className="py-3 px-4 text-center">Enrolled</th>
                  <th className="py-3 px-4">Allocated Hall</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {a.date}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-700">{a.slot_name}</span>
                      <p className="text-[11px] text-slate-400">{a.start_time} - {a.end_time}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-indigo-600 mr-1.5">{a.exam_code}</span>
                      <span className="font-medium text-slate-900">{a.exam_name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {a.groups_str}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {a.student_count}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{a.room_name}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">(Cap: {a.room_capacity})</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {a.is_locked ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Lock className="w-2.5 h-2.5 mr-1" /> Locked
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                          Auto
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEditModal(a)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                        title="Manual Reschedule"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: ROOM-WISE SCHEDULE */}
      {viewMode === 'room' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((r) => {
            const roomExams = filteredAssignments.filter((a) => a.room_id === r.id);
            return (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{r.name}</h3>
                    <p className="text-[11px] text-slate-500">Cap: {r.capacity} seats • {r.room_type}</p>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
                    {roomExams.length} sessions
                  </span>
                </div>

                {roomExams.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">No exams scheduled in this room</p>
                ) : (
                  <div className="space-y-2">
                    {roomExams.map((asgn) => (
                      <div
                        key={asgn.id}
                        onClick={() => openEditModal(asgn)}
                        className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-400 transition-colors cursor-pointer text-xs"
                      >
                        <div className="flex justify-between font-semibold">
                          <span className="text-indigo-600">{asgn.exam_code}</span>
                          <span className="text-slate-500">{asgn.date}</span>
                        </div>
                        <p className="font-medium text-slate-800 text-[11px] mt-0.5">{asgn.exam_name}</p>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-slate-200">
                          <span>{asgn.slot_name}</span>
                          <span>{asgn.groups_str}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 4: GROUP-WISE SCHEDULE */}
      {viewMode === 'group' && (
        <div className="space-y-4">
          {Array.from(new Set(assignments.flatMap((a) => a.groups_str.split(', ')))).map((grp) => {
            const grpExams = filteredAssignments.filter((a) => a.groups_str.includes(grp));
            return (
              <div key={grp} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center">
                    <Users className="w-4 h-4 text-indigo-600 mr-2" />
                    Student Cohort: {grp}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    {grpExams.length} papers scheduled
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {grpExams.map((asgn) => (
                    <div
                      key={asgn.id}
                      onClick={() => openEditModal(asgn)}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-white transition-colors cursor-pointer text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-indigo-600">{asgn.exam_code}</span>
                        <span className="text-[11px] font-semibold text-slate-600">{asgn.date}</span>
                      </div>
                      <p className="font-medium text-slate-800 text-xs mt-1">{asgn.exam_name}</p>
                      <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
                        <span>{asgn.slot_name}</span>
                        <span>{asgn.room_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Edit Assignment Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingAssignment ? `Edit Assignment: ${editingAssignment.exam_code}` : 'Edit Assignment'}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-900">{editingAssignment?.exam_code}: {editingAssignment?.exam_name}</span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cohorts: {editingAssignment?.groups_str} • Enrolled: {editingAssignment?.student_count} students
            </p>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Select Examination Date</label>
            <select
              value={editForm.date}
              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Select Time Slot</label>
            <select
              value={editForm.slot_id}
              onChange={(e) => setEditForm({ ...editForm, slot_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.start_time} - {s.end_time})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Select Examination Room</label>
            <select
              value={editForm.room_id}
              onChange={(e) => setEditForm({ ...editForm, room_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (Cap: {r.capacity}) {r.capacity < (editingAssignment?.student_count || 0) ? '⚠️ [Insufficient Capacity]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg border border-slate-200 bg-amber-50/50">
              <input
                type="checkbox"
                checked={editForm.is_locked}
                onChange={(e) => setEditForm({ ...editForm, is_locked: e.target.checked })}
                className="rounded text-indigo-600"
              />
              <span className="font-semibold text-slate-800 text-xs flex items-center">
                <Lock className="w-3.5 h-3.5 text-amber-600 mr-1" />
                Lock Assignment (Freeze during future AI Repairs)
              </span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
            >
              {isUpdating ? 'Revalidating...' : 'Update & Audit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
