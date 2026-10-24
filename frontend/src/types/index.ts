export interface Examination {
  id: string;
  code: string;
  name: string;
  student_count: number;
  group_ids: string[];
  duration_slots: number;
  allowed_dates: string[];
  allowed_slots: string[];
  required_room_type: string;
  preferred_gap_days: number;
  priority: number;
  is_fixed: boolean;
  fixed_date?: string | null;
  fixed_slot_id?: string | null;
  fixed_room_id?: string | null;
}

export interface StudentGroup {
  id: string;
  name: string;
  code: string;
  student_count: number;
  shared_conflicts: string[];
}

export interface Room {
  id: string;
  name: string;
  room_number: string;
  capacity: number;
  room_type: string;
  facilities: string[];
  unavailable_slots: string[][];
  is_active: boolean;
}

export interface TimeSlot {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  slot_order: number;
  is_active: boolean;
}

export interface SchedulingConfig {
  id: string;
  exam_period_name: string;
  start_date: string;
  end_date: string;
  available_dates: string[];
  default_duration_slots: number;
  min_preferred_gap_days: number;
  max_search_seconds: number;
  max_backtracks: number;
  optimize_soft_constraints: boolean;
  weight_consecutive: number;
  weight_same_day: number;
  weight_gap: number;
  weight_day_concentration: number;
  weight_room_utilization: number;
}

export interface Assignment {
  id: string;
  timetable_id: string;
  exam_id: string;
  exam_code: string;
  exam_name: string;
  date: string;
  slot_id: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  room_id: string;
  room_name: string;
  room_capacity: number;
  student_count: number;
  groups_str: string;
  is_locked: boolean;
}

export interface DecisionExplanation {
  step: number;
  event_type: string;
  exam_code: string;
  details: string;
  reason: string;
}

export interface ScheduleIssue {
  issue_type: string;
  severity: string;
  description: string;
  corrective_action: string;
  exam_codes?: string[];
  date?: string | null;
  slot_id?: string | null;
  room_id?: string | null;
}

export interface ValidationReport {
  is_valid: boolean;
  total_hard_violations: number;
  total_soft_warnings: number;
  summary: string;
  hard_violations: ScheduleIssue[];
  soft_warnings: ScheduleIssue[];
}

export interface Timetable {
  id: string;
  title: string;
  created_at: string;
  status: string;
  is_valid: boolean;
  total_exams: number;
  scheduled_exams: number;
  soft_penalty_total: number;
  soft_scores: {
    total_penalty?: number;
    consecutive_exam_penalty?: number;
    same_day_multiple_exam_penalty?: number;
    insufficient_gap_penalty?: number;
    day_concentration_penalty?: number;
    room_utilization_penalty?: number;
    details?: string[];
  };
  metrics: {
    status?: string;
    search_duration_seconds?: number;
    nodes_explored?: number;
    assignments_attempted?: number;
    backtracks?: number;
    constraint_checks?: number;
    forward_checking_prunes?: number;
  };
  validation_report: ValidationReport;
  failure_reasons: string[];
  assignments: Assignment[];
  explanations: DecisionExplanation[];
}

export interface DashboardStats {
  total_exams: number;
  scheduled_exams: number;
  available_rooms: number;
  total_student_groups: number;
  examination_days: number;
  hard_violations: number;
  room_utilization_percent: number;
  latest_timetable: Timetable | null;
  recent_activities: Array<{
    id: string;
    title: string;
    status: string;
    is_valid: boolean;
    scheduled_exams: number;
    penalty: number;
    created_at: string;
  }>;
}
