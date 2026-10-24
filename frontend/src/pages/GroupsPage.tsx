import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  AlertTriangle,
  BookOpen
} from 'lucide-react';
import { api } from '../services/api';
import { StudentGroup, Examination } from '../types';
import { Modal } from '../components/Modal';

export const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [exams, setExams] = useState<Examination[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StudentGroup | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    student_count: 60,
    shared_conflicts: [] as string[]
  });

  // Import Modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importReport, setImportReport] = useState<{ imported: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [gData, eData] = await Promise.all([api.getGroups(), api.getExams()]);
      setGroups(gData);
      setExams(eData);
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
    setEditingGroup(null);
    setFormData({
      code: '',
      name: '',
      student_count: 60,
      shared_conflicts: []
    });
    setIsModalOpen(true);
  };

  const openEditModal = (grp: StudentGroup) => {
    setEditingGroup(grp);
    setFormData({
      code: grp.code,
      name: grp.name,
      student_count: grp.student_count,
      shared_conflicts: grp.shared_conflicts
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await api.updateGroup(editingGroup.id, formData);
      } else {
        await api.createGroup(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Delete student group ${code}?`)) return;
    try {
      await api.deleteGroup(id);
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
      const res = await api.importCSV('groups', importFile);
      setImportReport(res);
      fetchData();
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  // Associated exams count per group
  const examsPerGroup = new Map<string, string[]>();
  for (const ex of exams) {
    for (const gid of ex.group_ids) {
      const list = examsPerGroup.get(gid) || [];
      list.push(ex.code);
      examsPerGroup.set(gid, list);
    }
  }

  const filteredGroups = groups.filter(
    (g) =>
      g.code.toLowerCase().includes(search.toLowerCase()) ||
      g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <Users className="w-5 h-5 text-indigo-600 mr-2" />
            Student Groups & Batches
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage academic batches, student headcount, and shared-student conflicts across departments.
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => {
              setImportFile(null);
              setImportReport(null);
              setIsImportOpen(true);
            }}
            className="inline-flex items-center px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Import CSV
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Student Group
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search group code or program name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <span className="text-xs text-slate-500">{filteredGroups.length} cohorts registered</span>
      </div>

      {/* Grid of Group Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-8 text-center text-slate-400 text-sm">Loading student groups...</div>
        ) : filteredGroups.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-500 text-sm">
            No student groups found.
          </div>
        ) : (
          filteredGroups.map((g) => {
            const enrolledExams = examsPerGroup.get(g.id) || [];
            return (
              <div
                key={g.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {g.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      {g.student_count} Students
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 mt-3">{g.name}</h3>

                  {/* Shared conflicts warning */}
                  {g.shared_conflicts.length > 0 && (
                    <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Shared Student Conflicts:</span>
                        <p>Clashes with {g.shared_conflicts.join(', ')} (no simultaneous exams)</p>
                      </div>
                    </div>
                  )}

                  {/* Associated exams */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center mb-1.5">
                      <BookOpen className="w-3 h-3 mr-1" />
                      Associated Examinations ({enrolledExams.length})
                    </span>
                    {enrolledExams.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {enrolledExams.map((code) => (
                          <span
                            key={code}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No exams enrolled</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end space-x-2">
                  <button
                    onClick={() => openEditModal(g)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(g.id, g.code)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGroup ? `Edit Group: ${editingGroup.code}` : 'Add Student Group'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Group Code *</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. CS-3A"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Total Student Count *</label>
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
            <label className="block font-medium text-slate-700 mb-1">Full Program / Batch Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. B.Tech Computer Science - Year 3 (Section A)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Shared-Student Group Conflicts (Electives / Cross-Enrollment)
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Select other groups that share students with this group. The CSP solver will never schedule exams for both simultaneously.
            </p>
            <div className="flex flex-wrap gap-2 p-2.5 border border-slate-300 rounded-lg max-h-32 overflow-y-auto bg-slate-50">
              {groups
                .filter((g) => !editingGroup || g.id !== editingGroup.id)
                .map((g) => {
                  const isConflict = formData.shared_conflicts.includes(g.code);
                  return (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => {
                        if (isConflict) {
                          setFormData({
                            ...formData,
                            shared_conflicts: formData.shared_conflicts.filter((c) => c !== g.code)
                          });
                        } else {
                          setFormData({
                            ...formData,
                            shared_conflicts: [...formData.shared_conflicts, g.code]
                          });
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        isConflict
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {g.code}
                    </button>
                  );
                })}
            </div>
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
              {editingGroup ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title="Import Student Groups CSV">
        <form onSubmit={handleImport} className="space-y-4 text-xs">
          <p className="text-slate-600">
            Upload CSV with columns: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">name, code, student_count</code>.
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
              <p className="font-semibold text-emerald-700">Successfully imported: {importReport.imported} groups</p>
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
