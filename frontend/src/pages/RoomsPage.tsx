import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Upload,
  CheckCircle2,
  XCircle,
  Tag,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { Room, TimeSlot } from '../types';
import { Modal } from '../components/Modal';

export const RoomsPage: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    room_number: '',
    capacity: 60,
    room_type: 'Standard',
    facilities: [] as string[],
    newFacility: '',
    unavailable_slots: [] as string[][],
    is_active: true
  });

  // Import Modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importReport, setImportReport] = useState<{ imported: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rData, sData] = await Promise.all([api.getRooms(), api.getSlots()]);
      setRooms(rData);
      setSlots(sData);
    } catch (err: any) {
      alert(`Error loading rooms: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingRoom(null);
    setFormData({
      name: '',
      room_number: '',
      capacity: 60,
      room_type: 'Standard',
      facilities: ['Projector', 'AC'],
      newFacility: '',
      unavailable_slots: [],
      is_active: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      room_number: room.room_number,
      capacity: room.capacity,
      room_type: room.room_type,
      facilities: room.facilities,
      newFacility: '',
      unavailable_slots: room.unavailable_slots,
      is_active: room.is_active
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        room_number: formData.room_number,
        capacity: formData.capacity,
        room_type: formData.room_type,
        facilities: formData.facilities,
        unavailable_slots: formData.unavailable_slots,
        is_active: formData.is_active
      };
      if (editingRoom) {
        await api.updateRoom(editingRoom.id, payload);
      } else {
        await api.createRoom(payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete room '${name}'?`)) return;
    try {
      await api.deleteRoom(id);
      fetchData();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const addFacility = () => {
    if (!formData.newFacility.trim()) return;
    if (!formData.facilities.includes(formData.newFacility.trim())) {
      setFormData({
        ...formData,
        facilities: [...formData.facilities, formData.newFacility.trim()],
        newFacility: ''
      });
    }
  };

  const removeFacility = (tag: string) => {
    setFormData({
      ...formData,
      facilities: formData.facilities.filter((f) => f !== tag)
    });
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    try {
      setImporting(true);
      const res = await api.importCSV('rooms', importFile);
      setImportReport(res);
      fetchData();
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.room_number.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || r.room_type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <Building2 className="w-5 h-5 text-indigo-600 mr-2" />
            Rooms & Seating Capacity
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage examination halls, dedicated computer labs, seating quotas, and maintenance blackouts.
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
            Add Room
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search room name or room number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-600">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="py-1 px-2 border border-slate-300 rounded-lg text-xs bg-white"
          >
            <option value="">All Types</option>
            <option value="Standard">Standard</option>
            <option value="Lab">Lab</option>
            <option value="Auditorium">Auditorium</option>
          </select>
        </div>
      </div>

      {/* Grid of Room Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-8 text-center text-slate-400 text-sm">Loading rooms...</div>
        ) : filteredRooms.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-500 text-sm">
            No rooms found matching criteria.
          </div>
        ) : (
          filteredRooms.map((r) => {
            const capPercent = Math.min(100, Math.round((r.capacity / 150) * 100));
            return (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {r.room_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                      r.room_type === 'Lab'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : r.room_type === 'Auditorium'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}>
                      {r.room_type}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 mt-2">{r.name}</h3>

                  {/* Seating Capacity Metric */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">Seating Capacity</span>
                      <span className="font-bold text-slate-900">{r.capacity} seats</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${capPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Facilities list */}
                  <div className="mt-4 flex flex-wrap gap-1">
                    {r.facilities.map((fac) => (
                      <span
                        key={fac}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 flex items-center"
                      >
                        <Tag className="w-2.5 h-2.5 mr-1 text-slate-400" />
                        {fac}
                      </span>
                    ))}
                  </div>

                  {/* Unavailable slots warning */}
                  {r.unavailable_slots.length > 0 && (
                    <div className="mt-3 p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-start space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Unavailable:</span>
                        <p>{r.unavailable_slots.map((s) => s.join(' ')).join(', ')}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className={`inline-flex items-center text-[11px] font-medium ${
                    r.is_active ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {r.is_active ? (
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                    )}
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>

                  <div className="flex space-x-1">
                    <button
                      onClick={() => openEditModal(r)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id, r.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
        title={editingRoom ? `Edit Room: ${editingRoom.name}` : 'Add Room'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Room Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Lecture Hall 101"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Room Number *</label>
              <input
                type="text"
                required
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                placeholder="e.g. LH-101"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Seating Capacity *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Room Classification *</label>
              <select
                value={formData.room_type}
                onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Standard">Standard Lecture Room</option>
                <option value="Lab">Computer / Tech Lab</option>
                <option value="Auditorium">Auditorium</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Facilities & Equipment</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={formData.newFacility}
                onChange={(e) => setFormData({ ...formData, newFacility: e.target.value })}
                placeholder="Add equipment (e.g. Projector, AC, Microphones)..."
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={addFacility}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
              >
                Add Tag
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {formData.facilities.map((fac) => (
                <span
                  key={fac}
                  className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200 flex items-center space-x-1"
                >
                  <span>{fac}</span>
                  <button
                    type="button"
                    onClick={() => removeFacility(fac)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded text-indigo-600"
              />
              <span className="font-semibold text-slate-800">Active Room for Examinations</span>
            </label>
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
              {editingRoom ? 'Save Changes' : 'Create Room'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title="Import Rooms CSV">
        <form onSubmit={handleImport} className="space-y-4 text-xs">
          <p className="text-slate-600">
            Upload CSV with columns: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">name, room_number, capacity, room_type</code>.
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
              <p className="font-semibold text-emerald-700">Successfully imported: {importReport.imported} rooms</p>
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
