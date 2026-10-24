import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Upload,
  Lock,
  Calendar,
  Users,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { Examination, StudentGroup, Room, TimeSlot } from '../types';
import { Modal } from '../components/Modal';

export const ExamsPage: React.FC = () => {
  const [exams, setExams] = useState<Examination[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [filterRoomType, setFilterRoomType] = useState('');
  const [sortBy, setSortBy] = useState<'code' | 'students' | 'priority'>('code');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Examination | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    student_count: 60,
    group_ids: [] as string[],
    duration_slots: 1,
    allowed_dates: [] as string[],
    allowed_slots: [] as string[],
    required_room_type: '',
    preferred_gap_days: 1,
    priority: 1,
    is_fixed: false,
    fixed_date: '',
    fixed_slot_id: '',
    fixed_room_id: ''
  });

  // Import Modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importReport, setImportReport] = useState<{ imported: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eData, gData, rData, sData] = await Promise.all([
        api.getExams(),
        api.getGroups(),
        api.getRooms(),
        api.getSlots()
      ]);
      setExams(eData);
      setGroups(gData);
      setRooms(rData);
      setSlots(sData);
    } catch (err: any) {
      alert(`Error loading data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingExam(null);
    setFormData({
      code: '',
      name: '',
      student_count: 60,
      group_ids: groups.length > 0 ? [groups[0].id] : [],
      duration_slots: 1,
      allowed_dates: [],
      allowed_slots: [],
      required_room_type: '',
      preferred_gap_days: 1,
      priority: 1,
      is_fixed: false,
      fixed_date: '',
      fixed_slot_id: '',
      fixed_room_id: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (exam: Examination) => {
    setEditingExam(exam);
    setFormData({
      code: exam.code,
      name: exam.name,
      student_count: exam.student_count,
      group_ids: exam.group_ids,
      duration_slots: exam.duration_slots,
      allowed_dates: exam.allowed_dates,
      allowed_slots: exam.allowed_slots,
      required_room_type: exam.required_room_type || '',
      preferred_gap_days: exam.preferred_gap_days,
      priority: exam.priority,
      is_fixed: exam.is_fixed,
      fixed_date: exam.fixed_date || '',
      fixed_slot_id: exam.fixed_slot_id || '',
      fixed_room_id: exam.fixed_room_id || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExam) {
        await api.updateExam(editingExam.id, formData);
      } else {
        await api.createExam(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete examination ${code}?`)) return;
    try {
      await api.deleteExam(id);
      fetchData();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    try {
      setImporting(true);
      const res = await api.importCSV('exams', importFile);
      setImportReport(res);
      fetchData();
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const groupMap = new Map(groups.map((g) => [g.id, g.code]));

  // Filtered & Sorted
  const filteredExams = exams
    .filter((e) => {
      const matchSearch =
        e.code.toLowerCase().includes(search.toLowerCase()) ||
        e.name.toLowerCase().includes(search.toLowerCase());
      const matchRoomType = !filterRoomType || e.required_room_type === filterRoomType;
      return matchSearch && matchRoomType;
    })
    .sort((a, b) => {
      if (sortBy === 'students') return b.student_count - a.student_count;
      if (sortBy === 'priority') return b.priority - a.priority;
      return a.code.localeCompare(b.code);
    });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <BookOpen className="w-5 h-5 text-indigo-600 mr-2" />
            Examinations & Courses
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Define subjects, student enrollment counts, cohort affiliations, and specific scheduling criteria.
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => {
              setImportFile(null);
              setImportReport(null);
              setIsImportOpen(true);
            }}
            className="inline-flex items-center px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition-colors"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Import CSV
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Examination
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search subject code or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Room Type:</span>
            <select
              value={filterRoomType}
              onChange={(e) => setFilterRoomType(e.target.value)}
              className="py-1 px-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">All Types</option>
              <option value="Standard">Standard</option>
              <option value="Lab">Lab</option>
              <option value="Auditorium">Auditorium</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-1 px-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="code">Subject Code</option>
              <option value="students">Enrollment Count</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Examinations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading examinations...</div>
        ) : filteredExams.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No examinations match the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Student Groups</th>
                  <th className="py-3 px-4 text-center">Students</th>
                  <th className="py-3 px-4">Room Type</th>
                  <th className="py-3 px-4 text-center">Priority</th>
                  <th className="py-3 px-4">Constraints</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExams.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-indigo-600">{e.code}</span>
                        <span>{e.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {e.group_ids.map((gid) => (
                          <span
                            key={gid}
                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {groupMap.get(gid) || gid}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-800">
                      {e.student_count}
                    </td>
                    <td className="py-3 px-4">
                      {e.required_room_type ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          {e.required_room_type}
                        </span>
                      ) : (
                        <span className="text-slate-400">Any Suitable</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        e.priority >= 3 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        P{e.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {e.is_fixed ? (
                        <span className="inline-flex items-center text-xs font-semibold text-amber-600">
                          <Lock className="w-3 h-3 mr-1" /> Locked Assignment
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Gap: {e.preferred_gap_days}d
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(e)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(e.id, e.code)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExam ? `Edit Examination: ${editingExam.code}` : 'Add New Examination'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Subject Code *</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. CS301"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Student Enrollment Count *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.student_count}
                onChange={(e) => setFormData({ ...formData, student_count: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Subject Title / Course Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Operating Systems & System Programming"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Enrolled Student Groups / Batches</label>
            <div className="flex flex-wrap gap-2 p-2.5 border border-slate-300 rounded-lg max-h-32 overflow-y-auto bg-slate-50">
              {groups.map((g) => {
                const isSelected = formData.group_ids.includes(g.id);
                return (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => {
                      if (isSelected) {
                        setFormData({ ...formData, group_ids: formData.group_ids.filter((id) => id !== g.id) });
                      } else {
                        setFormData({ ...formData, group_ids: [...formData.group_ids, g.id] });
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {g.code} ({g.name})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Required Room Type</label>
              <select
                value={formData.required_room_type}
                onChange={(e) => setFormData({ ...formData, required_room_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Any Room Type</option>
                <option value="Standard">Standard Lecture Room</option>
                <option value="Lab">Computer / Tech Lab</option>
                <option value="Auditorium">Auditorium (Large)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Preferred Gap (Days)</label>
              <input
                type="number"
                min="0"
                value={formData.preferred_gap_days}
                onChange={(e) => setFormData({ ...formData, preferred_gap_days: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Scheduling Priority (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Fixed Constraints Toggle */}
          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center space-x-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={formData.is_fixed}
                onChange={(e) => setFormData({ ...formData, is_fixed: e.target.checked })}
                className="rounded text-indigo-600"
              />
              <span className="font-semibold text-slate-800">Manually Lock Assignment to Fixed Slot / Room</span>
            </label>

            {formData.is_fixed && (
              <div className="grid grid-cols-3 gap-3 bg-amber-50 p-3 rounded-lg border border-amber-200 mt-2">
                <div>
                  <label className="block font-medium text-amber-900 mb-1">Fixed Date</label>
                  <input
                    type="date"
                    value={formData.fixed_date}
                    onChange={(e) => setFormData({ ...formData, fixed_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-amber-300 rounded bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-amber-900 mb-1">Fixed Slot</label>
                  <select
                    value={formData.fixed_slot_id}
                    onChange={(e) => setFormData({ ...formData, fixed_slot_id: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-amber-300 rounded bg-white text-xs"
                  >
                    <option value="">Any Slot</option>
                    {slots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.start_time})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-amber-900 mb-1">Fixed Room</label>
                  <select
                    value={formData.fixed_room_id}
                    onChange={(e) => setFormData({ ...formData, fixed_room_id: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-amber-300 rounded bg-white text-xs"
                  >
                    <option value="">Any Room</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Cap: {r.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
            >
              {editingExam ? 'Save Changes' : 'Create Examination'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title="Import Examinations CSV">
        <form onSubmit={handleImport} className="space-y-4 text-xs">
          <p className="text-slate-600">
            Upload a CSV file containing columns: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">code, name, student_count, groups, room_type</code>.
          </p>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          {importReport && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <p className="font-semibold text-emerald-700">Successfully imported: {importReport.imported} rows</p>
              {importReport.errors.length > 0 && (
                <div className="text-rose-600 space-y-0.5 max-h-28 overflow-y-auto">
                  <p className="font-semibold">Import Warnings / Errors:</p>
                  {importReport.errors.map((err, i) => (
                    <p key={i} className="text-[11px]">• {err}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setIsImportOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={!importFile || importing}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
            >
              {importing ? 'Importing...' : 'Upload & Import'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
