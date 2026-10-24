import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Clock,
  Calendar,
  Save,
  Plus,
  Trash2,
  HelpCircle,
  Check,
  Scale
} from 'lucide-react';
import { api } from '../services/api';
import { SchedulingConfig, TimeSlot } from '../types';

export const ConfigPage: React.FC = () => {
  const [config, setConfig] = useState<SchedulingConfig | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New slot form
  const [newSlot, setNewSlot] = useState({
    name: '',
    start_time: '09:30',
    end_time: '12:30',
    slot_order: 1
  });

  // New date input
  const [newDate, setNewDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cData, sData] = await Promise.all([api.getConfig(), api.getSlots()]);
      setConfig(cData);
      setSlots(sData);
      setNewSlot((prev) => ({ ...prev, slot_order: sData.length + 1 }));
    } catch (err: any) {
      alert(`Error loading configuration: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    try {
      setSaving(true);
      await api.updateConfig(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save config: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlot.name.trim()) return;
    try {
      await api.createSlot({
        name: newSlot.name.trim(),
        start_time: newSlot.start_time,
        end_time: newSlot.end_time,
        slot_order: newSlot.slot_order,
        is_active: true
      });
      setNewSlot({
        name: '',
        start_time: '09:30',
        end_time: '12:30',
        slot_order: slots.length + 2
      });
      const updatedSlots = await api.getSlots();
      setSlots(updatedSlots);
    } catch (err: any) {
      alert(`Failed to add slot: ${err.message}`);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!window.confirm('Delete this time slot?')) return;
    try {
      await api.deleteSlot(id);
      const updatedSlots = await api.getSlots();
      setSlots(updatedSlots);
    } catch (err: any) {
      alert(`Failed to delete slot: ${err.message}`);
    }
  };

  const handleAddDate = () => {
    if (!newDate || !config) return;
    if (!config.available_dates.includes(newDate)) {
      const updatedDates = [...config.available_dates, newDate].sort();
      setConfig({ ...config, available_dates: updatedDates });
      setNewDate('');
    }
  };

  const handleRemoveDate = (dateToRemove: string) => {
    if (!config) return;
    setConfig({
      ...config,
      available_dates: config.available_dates.filter((d) => d !== dateToRemove)
    });
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <Sliders className="w-5 h-5 text-indigo-600 mr-2" />
            Scheduling Configuration & Weights
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Fine-tune examination periods, operational time slots, search budgets, and soft-constraint penalty weights.
          </p>
        </div>
        {saveSuccess && (
          <span className="flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <Check className="w-4 h-4 mr-1 text-emerald-600" /> Settings Saved!
          </span>
        )}
      </div>

      <form onSubmit={handleSaveConfig} className="space-y-6">
        {/* Section 1: Examination Period & Dates */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center border-b border-slate-100 pb-3">
            <Calendar className="w-4 h-4 text-indigo-600 mr-2" />
            Examination Period & Calendar
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Session / Term Title</label>
              <input
                type="text"
                value={config.exam_period_name}
                onChange={(e) => setConfig({ ...config, exam_period_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Period Start Date</label>
              <input
                type="date"
                value={config.start_date}
                onChange={(e) => setConfig({ ...config, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Period End Date</label>
              <input
                type="date"
                value={config.end_date}
                onChange={(e) => setConfig({ ...config, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Active Examination Dates */}
          <div className="pt-2">
            <label className="block font-medium text-slate-700 text-xs mb-1.5">
              Available Examination Dates ({config.available_dates.length} scheduled days)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
              <button
                type="button"
                onClick={handleAddDate}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Add Exam Date
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.available_dates.map((d) => (
                <span
                  key={d}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center space-x-1.5"
                >
                  <span>{d}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDate(d)}
                    className="text-indigo-400 hover:text-rose-600 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Time Slots Definition */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center">
              <Clock className="w-4 h-4 text-indigo-600 mr-2" />
              Daily Examination Time Slots
            </h2>
            <span className="text-xs text-slate-500">{slots.length} daily periods</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {slots.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-indigo-600">Slot {s.slot_order}</span>
                    <span className="font-semibold text-slate-800">{s.name}</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {s.start_time} — {s.end_time}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSlot(s.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Delete Slot"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Slot Sub-form */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-700 block mb-2">Register New Slot</span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <input
                type="text"
                placeholder="Slot Name (e.g. Evening Session)"
                value={newSlot.name}
                onChange={(e) => setNewSlot({ ...newSlot, name: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg sm:col-span-1"
              />
              <input
                type="time"
                value={newSlot.start_time}
                onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg"
              />
              <input
                type="time"
                value={newSlot.end_time}
                onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={handleAddSlot}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg flex items-center justify-center"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Slot
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Soft-Constraint Penalty Weights */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center">
                <Scale className="w-4 h-4 text-indigo-600 mr-2" />
                Soft-Constraint Objective Function Weights
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Higher penalty weight indicates stronger optimization priority to eliminate that undesirable condition.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Weight: Consecutive Exams */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-800">Consecutive Slots for Same Group</span>
                <span className="font-mono font-bold text-indigo-600">{config.weight_consecutive} pts</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Penalizes scheduling back-to-back examinations on the same day for the same student cohort without rest.
              </p>
              <input
                type="range"
                min="0"
                max="50"
                value={config.weight_consecutive}
                onChange={(e) => setConfig({ ...config, weight_consecutive: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Weight: Same Day Multiple */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-800">Multiple Exams on Same Day</span>
                <span className="font-mono font-bold text-indigo-600">{config.weight_same_day} pts</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Strongly penalizes scheduling &gt; 1 examination on the same calendar day for any single group.
              </p>
              <input
                type="range"
                min="0"
                max="60"
                value={config.weight_same_day}
                onChange={(e) => setConfig({ ...config, weight_same_day: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Weight: Insufficient Gap */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-800">Insufficient Revision Gap</span>
                <span className="font-mono font-bold text-indigo-600">{config.weight_gap} pts</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Penalizes examinations scheduled on consecutive days when a study gap is requested.
              </p>
              <input
                type="range"
                min="0"
                max="30"
                value={config.weight_gap}
                onChange={(e) => setConfig({ ...config, weight_gap: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Weight: Day Load Balance */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-800">Day Load Concentration</span>
                <span className="font-mono font-bold text-indigo-600">{config.weight_day_concentration} pts</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Penalizes high variance in exam counts across days to maintain even institutional load.
              </p>
              <input
                type="range"
                min="0"
                max="20"
                value={config.weight_day_concentration}
                onChange={(e) => setConfig({ ...config, weight_day_concentration: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Weight: Room Utilization */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 md:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-800">Room Utilization / Empty Seats</span>
                <span className="font-mono font-bold text-indigo-600">{config.weight_room_utilization} pts</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Penalizes placing small classes into oversized auditoriums when appropriately sized lecture halls exist.
              </p>
              <input
                type="range"
                min="0"
                max="15"
                value={config.weight_room_utilization}
                onChange={(e) => setConfig({ ...config, weight_room_utilization: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Solver Search Budget & Optimization */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            CSP Solver Budget & Optimization Controls
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Search Time Budget (Seconds)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={config.max_search_seconds}
                onChange={(e) => setConfig({ ...config, max_search_seconds: parseFloat(e.target.value) || 5 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Max Backtracks Threshold</label>
              <input
                type="number"
                min="100"
                max="50000"
                value={config.max_backtracks}
                onChange={(e) => setConfig({ ...config, max_backtracks: parseInt(e.target.value) || 1000 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={config.optimize_soft_constraints}
                  onChange={(e) => setConfig({ ...config, optimize_soft_constraints: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <span className="font-semibold text-slate-800 text-xs">
                  Branch-and-Bound Soft Optimization
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
