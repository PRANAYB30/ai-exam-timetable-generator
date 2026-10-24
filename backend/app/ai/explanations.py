from __future__ import annotations
from typing import List, Dict, Any
from .models import DecisionEvent, SolverMetrics, SoftScoreBreakdown

class ExplanationGenerator:
    """
    Transforms recorded CSP solver events into clear, structured,
    human-readable explanations suitable for academic viva demonstrations and administrative audits.
    """

    @staticmethod
    def generate_narrative_summary(
        metrics: SolverMetrics,
        soft_score: SoftScoreBreakdown,
        events: List[DecisionEvent]
    ) -> List[str]:
        summary_points: List[str] = []

        summary_points.append(
            f"Search Outcome: {metrics.status} in {metrics.search_duration_seconds:.3f} seconds "
            f"across {metrics.nodes_explored} decision nodes and {metrics.assignments_attempted} assignment trials."
        )

        if metrics.backtracks > 0:
            summary_points.append(
                f"Backtracking Reasoning: The CSP solver reversed course {metrics.backtracks} times. "
                f"Forward checking pruned {metrics.forward_checking_prunes} domain values proactively to prevent dead-ends."
            )
        else:
            summary_points.append(
                "Optimal Search Path: The MRV heuristic and LCV value ordering selected assignments so accurately "
                "that zero backtracks were needed to reach a feasible timetable."
            )

        if soft_score:
            summary_points.append(
                f"Schedule Quality: Evaluated soft constraints achieved a penalty score of {soft_score.total_penalty:.2f} "
                f"(Consecutive: {soft_score.consecutive_exam_penalty}, Same-day multiple: {soft_score.same_day_multiple_exam_penalty}, "
                f"Spacing gaps: {soft_score.insufficient_gap_penalty}, Day load balance: {soft_score.day_concentration_penalty}, "
                f"Room utilization: {soft_score.room_utilization_penalty})."
            )

        return summary_points

    @staticmethod
    def format_event_log(events: List[DecisionEvent]) -> List[Dict[str, Any]]:
        """Formats the raw decision events into clean dictionaries for API responses."""
        formatted = []
        for e in events:
            formatted.append({
                "step": e.step,
                "event_type": e.event_type,
                "exam_id": e.exam_id,
                "exam_code": e.exam_code,
                "details": e.details,
                "reason": e.reason
            })
        return formatted
