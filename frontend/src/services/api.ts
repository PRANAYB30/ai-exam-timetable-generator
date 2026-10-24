import {
  DashboardStats,
  Examination,
  StudentGroup,
  Room,
  TimeSlot,
  SchedulingConfig,
  Timetable,
  Assignment
} from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    let errorMsg = `API Error: ${res.status} ${res.statusText}`;
    try {
      const errorJson = await res.json();
      if (errorJson.detail) errorMsg = errorJson.detail;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

export const api = {
  // Dashboard
  getDashboardStats: () => request<DashboardStats>('/dashboard'),

  // Examinations
  getExams: (params?: { search?: string; room_type?: string; group_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.room_type) q.append('room_type', params.room_type);
    if (params?.group_id) q.append('group_id', params.group_id);
    return request<Examination[]>(`/exams${q.toString() ? `?${q.toString()}` : ''}`);
  },
  getExam: (id: string) => request<Examination>(`/exams/${id}`),
  createExam: (data: Partial<Examination>) => request<Examination>('/exams', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateExam: (id: string, data: Partial<Examination>) => request<Examination>(`/exams/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteExam: (id: string) => request<void>(`/exams/${id}`, { method: 'DELETE' }),

  // Student Groups
  getGroups: (params?: { search?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    return request<StudentGroup[]>(`/groups${q.toString() ? `?${q.toString()}` : ''}`);
  },
  createGroup: (data: Partial<StudentGroup>) => request<StudentGroup>('/groups', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateGroup: (id: string, data: Partial<StudentGroup>) => request<StudentGroup>(`/groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteGroup: (id: string) => request<void>(`/groups/${id}`, { method: 'DELETE' }),

  // Rooms
  getRooms: (params?: { search?: string; room_type?: string; min_capacity?: number; active_only?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.room_type) q.append('room_type', params.room_type);
    if (params?.min_capacity) q.append('min_capacity', params.min_capacity.toString());
    if (params?.active_only) q.append('active_only', 'true');
    return request<Room[]>(`/rooms${q.toString() ? `?${q.toString()}` : ''}`);
  },
  createRoom: (data: Partial<Room>) => request<Room>('/rooms', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateRoom: (id: string, data: Partial<Room>) => request<Room>(`/rooms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteRoom: (id: string) => request<void>(`/rooms/${id}`, { method: 'DELETE' }),

  // Time Slots
  getSlots: () => request<TimeSlot[]>('/slots'),
  createSlot: (data: Partial<TimeSlot>) => request<TimeSlot>('/slots', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateSlot: (id: string, data: Partial<TimeSlot>) => request<TimeSlot>(`/slots/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteSlot: (id: string) => request<void>(`/slots/${id}`, { method: 'DELETE' }),

  // Configuration
  getConfig: () => request<SchedulingConfig>('/config'),
  updateConfig: (data: Partial<SchedulingConfig>) => request<SchedulingConfig>('/config', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // Timetables
  getTimetables: () => request<Timetable[]>('/timetables'),
  getTimetable: (id: string) => request<Timetable>(`/timetables/${id}`),
  generateTimetable: (params?: { title?: string; max_search_seconds?: number; optimize_soft_constraints?: boolean }) =>
    request<Timetable>('/timetables/generate', {
      method: 'POST',
      body: JSON.stringify(params || {})
    }),
  updateAssignment: (timetableId: string, assignmentId: string, data: Partial<Assignment>) =>
    request<Timetable>(`/timetables/${timetableId}/assignments/${assignmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  repairTimetable: (timetableId: string) =>
    request<Timetable>(`/timetables/${timetableId}/repair`, {
      method: 'POST'
    }),
  deleteTimetable: (timetableId: string) =>
    request<void>(`/timetables/${timetableId}`, {
      method: 'DELETE'
    }),

  // Demo Data Reset
  resetDemoData: () => request<{ message: string; status: string }>('/demo/reset', { method: 'POST' }),

  // CSV Import
  importCSV: async (entity: 'exams' | 'groups' | 'rooms', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/import/${entity}`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Import failed');
    }
    return res.json() as Promise<{ imported: number; errors: string[] }>;
  }
};
