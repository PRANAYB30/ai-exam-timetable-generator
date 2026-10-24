from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Set, Tuple, Optional, Any

@dataclass(frozen=True)
class CSPSlot:
    id: str
    name: str
    start_time: str
    end_time: str
    slot_order: int

@dataclass(frozen=True)
class CSPRoom:
    id: str
    name: str
    capacity: int
    room_type: str = "Standard"
    facilities: Tuple[str, ...] = ()
    # List of (date, slot_id) where room is unavailable
    unavailable_slots: Tuple[Tuple[str, str], ...] = ()

@dataclass(frozen=True)
class CSPExam:
    id: str
    code: str
    name: str
    group_ids: Tuple[str, ...]
    student_count: int
    duration_slots: int = 1
    allowed_dates: Optional[Tuple[str, ...]] = None
    allowed_slot_ids: Optional[Tuple[str, ...]] = None
    required_room_type: Optional[str] = None
    preferred_gap_days: int = 1
    priority: int = 1
    is_fixed: bool = False
    fixed_date: Optional[str] = None
    fixed_slot_id: Optional[str] = None
    fixed_room_id: Optional[str] = None

@dataclass(frozen=True)
class CSPValue:
    date: str
    slot_id: str
    room_id: str

@dataclass
class SoftConstraintWeights:
    consecutive_exam_penalty: float = 20.0
    same_day_multiple_exam_penalty: float = 30.0
    insufficient_gap_penalty: float = 12.0
    day_concentration_penalty: float = 5.0
    room_utilization_penalty: float = 3.0

@dataclass
class SolverMetrics:
    assignments_attempted: int = 0
    backtracks: int = 0
    constraint_checks: int = 0
    forward_checking_prunes: int = 0
    search_duration_seconds: float = 0.0
    nodes_explored: int = 0
    status: str = "NOT_STARTED" # SUCCESS_FEASIBLE, SUCCESS_OPTIMAL, INFEASIBLE, BUDGET_EXCEEDED, TIMEOUT

@dataclass
class DecisionEvent:
    step: int
    event_type: str # VARIABLE_SELECTION, VALUE_ORDERING, ASSIGNMENT, BACKTRACK, PRUNED, SOLUTION_FOUND, CONFLICT_DETECTED
    exam_id: str
    exam_code: str
    details: str
    reason: str

@dataclass
class SoftScoreBreakdown:
    total_penalty: float
    consecutive_exam_penalty: float
    same_day_multiple_exam_penalty: float
    insufficient_gap_penalty: float
    day_concentration_penalty: float
    room_utilization_penalty: float
    details: List[str] = field(default_factory=list)

@dataclass
class TimetableResult:
    success: bool
    status: str
    assignments: Dict[str, CSPValue] = field(default_factory=dict)
    metrics: SolverMetrics = field(default_factory=SolverMetrics)
    soft_score: Optional[SoftScoreBreakdown] = None
    explanations: List[DecisionEvent] = field(default_factory=list)
    failure_reasons: List[str] = field(default_factory=list)
