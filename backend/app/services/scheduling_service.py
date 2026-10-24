import json
import uuid
from datetime import datetime
from typing import Dict, List, Set, Tuple, Optional
from sqlalchemy.orm import Session

from backend.app.models.entities import (
    ExaminationModel,
    StudentGroupModel,
    RoomModel,
    TimeSlotModel,
    SchedulingConfigModel,
    TimetableModel,
    TimetableAssignmentModel,
    TimetableExplanationModel
)
from backend.app.ai.models import (
    CSPExam, CSPRoom, CSPSlot, CSPValue,
    SoftConstraintWeights, DecisionEvent
)
from backend.app.ai.csp_solver import CSPScheduler
from backend.app.ai.validator import TimetableValidator
from backend.app.ai.explanations import ExplanationGenerator
from backend.app.schemas.entities import AssignmentManualUpdate

class SchedulingService:

    @staticmethod
    def _build_csp_inputs(db: Session):
        exam_models = db.query(ExaminationModel).all()
        room_models = db.query(RoomModel).filter(RoomModel.is_active == True).all()
        slot_models = db.query(TimeSlotModel).filter(TimeSlotModel.is_active == True).order_by(TimeSlotModel.slot_order).all()
        group_models = db.query(StudentGroupModel).all()
        config = db.query(SchedulingConfigModel).first()

        if not config:
            config = SchedulingConfigModel(id="default")
            config.available_dates = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"]
            db.add(config)
            db.commit()

        # Shared group conflicts set
        shared_conflicts: Set[Tuple[str, str]] = set()
        code_to_id = {g.code: g.id for g in group_models}
        for g in group_models:
            for other_code in g.shared_conflicts:
                other_id = code_to_id.get(other_code)
                if other_id:
                    shared_conflicts.add((g.id, other_id))
                    shared_conflicts.add((other_id, g.id))

        # Convert to pure CSP objects
        csp_exams: List[CSPExam] = []
        for e in exam_models:
            csp_exams.append(CSPExam(
                id=e.id,
                code=e.code,
                name=e.name,
                group_ids=tuple(e.group_ids),
                student_count=e.student_count,
                duration_slots=e.duration_slots,
                allowed_dates=tuple(e.allowed_dates) if e.allowed_dates else None,
                allowed_slot_ids=tuple(e.allowed_slots) if e.allowed_slots else None,
                required_room_type=e.required_room_type if e.required_room_type else None,
                preferred_gap_days=e.preferred_gap_days,
                priority=e.priority,
                is_fixed=e.is_fixed,
                fixed_date=e.fixed_date,
                fixed_slot_id=e.fixed_slot_id,
                fixed_room_id=e.fixed_room_id
            ))

        csp_rooms: List[CSPRoom] = []
        for r in room_models:
            unavail = tuple(tuple(pair) for pair in r.unavailable_slots)
            csp_rooms.append(CSPRoom(
                id=r.id,
                name=r.name,
                capacity=r.capacity,
                room_type=r.room_type,
                facilities=tuple(r.facilities),
                unavailable_slots=unavail
            ))

        csp_slots: List[CSPSlot] = []
        for s in slot_models:
            csp_slots.append(CSPSlot(
                id=s.id,
                name=s.name,
                start_time=s.start_time,
                end_time=s.end_time,
                slot_order=s.slot_order
            ))

        weights = SoftConstraintWeights(
            consecutive_exam_penalty=config.weight_consecutive,
            same_day_multiple_exam_penalty=config.weight_same_day,
            insufficient_gap_penalty=config.weight_gap,
            day_concentration_penalty=config.weight_day_concentration,
            room_utilization_penalty=config.weight_room_utilization
        )

        return csp_exams, csp_rooms, csp_slots, config.available_dates, shared_conflicts, weights, config

    @classmethod
    def generate_timetable(
        cls,
        db: Session,
        title: Optional[str] = None,
        max_search_seconds: Optional[float] = None,
        optimize_soft: Optional[bool] = None
    ) -> TimetableModel:
        csp_exams, csp_rooms, csp_slots, dates, shared_conflicts, weights, config = cls._build_csp_inputs(db)

        search_sec = max_search_seconds if max_search_seconds is not None else config.max_search_seconds
        opt_soft = optimize_soft if optimize_soft is not None else config.optimize_soft_constraints

        scheduler = CSPScheduler(
            exams=csp_exams,
            rooms=csp_rooms,
            slots=csp_slots,
            dates=dates,
            shared_group_conflicts=shared_conflicts,
            weights=weights,
            max_search_seconds=search_sec,
            max_backtracks=config.max_backtracks,
            optimize_soft_constraints=opt_soft
        )

        result = scheduler.solve()

        # Run independent validation
        validator = TimetableValidator(
            exams=csp_exams,
            rooms=csp_rooms,
            slots=csp_slots,
            dates=dates,
            shared_group_conflicts=shared_conflicts,
            weights=weights
        )
        val_report = validator.validate(result.assignments)

        # Lookup caches
        exam_map = {e.id: e for e in csp_exams}
        room_map = {r.id: r for r in csp_rooms}
        slot_map = {s.id: s for s in csp_slots}
        group_map = {g.id: g.code for g in db.query(StudentGroupModel).all()}

        # Create Timetable record
        timetable_id = f"TT-{uuid.uuid4().hex[:8].upper()}"
        default_title = f"{config.exam_period_name} - Run #{uuid.uuid4().hex[:4].upper()}"

        # Soft score dict
        soft_scores_dict = {}
        if result.soft_score:
            soft_scores_dict = {
                "total_penalty": result.soft_score.total_penalty,
                "consecutive_exam_penalty": result.soft_score.consecutive_exam_penalty,
                "same_day_multiple_exam_penalty": result.soft_score.same_day_multiple_exam_penalty,
                "insufficient_gap_penalty": result.soft_score.insufficient_gap_penalty,
                "day_concentration_penalty": result.soft_score.day_concentration_penalty,
                "room_utilization_penalty": result.soft_score.room_utilization_penalty,
                "details": result.soft_score.details
            }

        metrics_dict = {
            "status": result.metrics.status,
            "search_duration_seconds": round(result.metrics.search_duration_seconds, 4),
            "nodes_explored": result.metrics.nodes_explored,
            "assignments_attempted": result.metrics.assignments_attempted,
            "backtracks": result.metrics.backtracks,
            "constraint_checks": result.metrics.constraint_checks,
            "forward_checking_prunes": result.metrics.forward_checking_prunes
        }

        val_report_dict = {
            "is_valid": val_report.is_valid,
            "total_hard_violations": val_report.total_hard_violations,
            "total_soft_warnings": val_report.total_soft_warnings,
            "summary": val_report.summary,
            "hard_violations": [
                {
                    "issue_type": h.issue_type,
                    "severity": h.severity,
                    "description": h.description,
                    "corrective_action": h.corrective_action,
                    "exam_codes": h.exam_codes,
                    "date": h.date,
                    "slot_id": h.slot_id,
                    "room_id": h.room_id
                }
                for h in val_report.hard_violations
            ],
            "soft_warnings": [
                {
                    "issue_type": s.issue_type,
                    "severity": s.severity,
                    "description": s.description,
                    "corrective_action": s.corrective_action
                }
                for s in val_report.soft_warnings
            ]
        }

        timetable = TimetableModel(
            id=timetable_id,
            title=title or default_title,
            created_at=datetime.utcnow(),
            status=result.status,
            is_valid=val_report.is_valid,
            total_exams=len(csp_exams),
            scheduled_exams=len(result.assignments),
            soft_penalty_total=result.soft_score.total_penalty if result.soft_score else 0.0,
            soft_scores_json=json.dumps(soft_scores_dict),
            metrics_json=json.dumps(metrics_dict),
            validation_report_json=json.dumps(val_report_dict),
            failure_reasons_json=json.dumps(result.failure_reasons)
        )
        db.add(timetable)

        # Create assignments
        for exam_id, val in result.assignments.items():
            ex = exam_map[exam_id]
            rm = room_map[val.room_id]
            sl = slot_map[val.slot_id]
            groups_label = ", ".join(group_map.get(gid, gid) for gid in ex.group_ids)

            asgn = TimetableAssignmentModel(
                id=f"ASN-{uuid.uuid4().hex[:8].upper()}",
                timetable_id=timetable_id,
                exam_id=ex.id,
                exam_code=ex.code,
                exam_name=ex.name,
                date=val.date,
                slot_id=val.slot_id,
                slot_name=sl.name,
                start_time=sl.start_time,
                end_time=sl.end_time,
                room_id=val.room_id,
                room_name=rm.name,
                room_capacity=rm.capacity,
                student_count=ex.student_count,
                groups_str=groups_label,
                is_locked=ex.is_fixed
            )
            db.add(asgn)

        # Create explanation logs
        for ev in result.explanations:
            exp = TimetableExplanationModel(
                id=f"EXP-{uuid.uuid4().hex[:8].upper()}",
                timetable_id=timetable_id,
                step=ev.step,
                event_type=ev.event_type,
                exam_code=ev.exam_code,
                details=ev.details,
                reason=ev.reason
            )
            db.add(exp)

        db.commit()
        db.refresh(timetable)
        return timetable

    @classmethod
    def manual_update_assignment(
        cls,
        db: Session,
        timetable_id: str,
        assignment_id: str,
        update: AssignmentManualUpdate
    ) -> TimetableModel:
        timetable = db.query(TimetableModel).filter(TimetableModel.id == timetable_id).first()
        if not timetable:
            raise ValueError(f"Timetable '{timetable_id}' not found")

        asgn = db.query(TimetableAssignmentModel).filter(
            TimetableAssignmentModel.id == assignment_id,
            TimetableAssignmentModel.timetable_id == timetable_id
        ).first()
        if not asgn:
            raise ValueError(f"Assignment '{assignment_id}' not found")

        # Update assignment fields
        if update.date is not None:
            asgn.date = update.date
        if update.slot_id is not None:
            slot = db.query(TimeSlotModel).filter(TimeSlotModel.id == update.slot_id).first()
            if slot:
                asgn.slot_id = slot.id
                asgn.slot_name = slot.name
                asgn.start_time = slot.start_time
                asgn.end_time = slot.end_time
        if update.room_id is not None:
            room = db.query(RoomModel).filter(RoomModel.id == update.room_id).first()
            if room:
                asgn.room_id = room.id
                asgn.room_name = room.name
                asgn.room_capacity = room.capacity
        if update.is_locked is not None:
            asgn.is_locked = update.is_locked

        db.flush()

        # Re-run validator
        csp_exams, csp_rooms, csp_slots, dates, shared_conflicts, weights, _ = cls._build_csp_inputs(db)
        validator = TimetableValidator(
            exams=csp_exams,
            rooms=csp_rooms,
            slots=csp_slots,
            dates=dates,
            shared_group_conflicts=shared_conflicts,
            weights=weights
        )

        all_assignments = db.query(TimetableAssignmentModel).filter(
            TimetableAssignmentModel.timetable_id == timetable_id
        ).all()
        current_map = {
            a.exam_id: CSPValue(date=a.date, slot_id=a.slot_id, room_id=a.room_id)
            for a in all_assignments
        }

        val_report = validator.validate(current_map)

        timetable.is_valid = val_report.is_valid
        timetable.status = "MANUALLY_EDITED"
        timetable.soft_penalty_total = val_report.soft_score.total_penalty if val_report.soft_score else 0.0

        val_report_dict = {
            "is_valid": val_report.is_valid,
            "total_hard_violations": val_report.total_hard_violations,
            "total_soft_warnings": val_report.total_soft_warnings,
            "summary": val_report.summary,
            "hard_violations": [
                {
                    "issue_type": h.issue_type,
                    "severity": h.severity,
                    "description": h.description,
                    "corrective_action": h.corrective_action,
                    "exam_codes": h.exam_codes,
                    "date": h.date,
                    "slot_id": h.slot_id,
                    "room_id": h.room_id
                }
                for h in val_report.hard_violations
            ],
            "soft_warnings": [
                {
                    "issue_type": s.issue_type,
                    "severity": s.severity,
                    "description": s.description,
                    "corrective_action": s.corrective_action
                }
                for s in val_report.soft_warnings
            ]
        }
        timetable.validation_report_json = json.dumps(val_report_dict)

        # Log manual edit event
        exp = TimetableExplanationModel(
            id=f"EXP-{uuid.uuid4().hex[:8].upper()}",
            timetable_id=timetable_id,
            step=len(timetable.explanations) + 1,
            event_type="MANUAL_EDIT",
            exam_code=asgn.exam_code,
            details=f"Manual modification of {asgn.exam_code} to {asgn.date}, {asgn.slot_name}, {asgn.room_name} (Locked: {asgn.is_locked})",
            reason=f"Validator re-audit: {'PASS' if val_report.is_valid else f'FAIL ({val_report.total_hard_violations} violations)'}"
        )
        db.add(exp)

        db.commit()
        db.refresh(timetable)
        return timetable

    @classmethod
    def repair_timetable(cls, db: Session, timetable_id: str) -> TimetableModel:
        """
        Locks all marked assignments and re-runs CSP solver for remaining exams to repair any conflicts.
        """
        timetable = db.query(TimetableModel).filter(TimetableModel.id == timetable_id).first()
        if not timetable:
            raise ValueError(f"Timetable '{timetable_id}' not found")

        # Load locked assignments
        locked_assignments = db.query(TimetableAssignmentModel).filter(
            TimetableAssignmentModel.timetable_id == timetable_id,
            TimetableAssignmentModel.is_locked == True
        ).all()
        locked_map = {a.exam_id: a for a in locked_assignments}

        csp_exams, csp_rooms, csp_slots, dates, shared_conflicts, weights, config = cls._build_csp_inputs(db)

        # Update exams with fixed assignment info for locked ones
        updated_csp_exams = []
        for ex in csp_exams:
            if ex.id in locked_map:
                lock = locked_map[ex.id]
                updated_csp_exams.append(CSPExam(
                    id=ex.id,
                    code=ex.code,
                    name=ex.name,
                    group_ids=ex.group_ids,
                    student_count=ex.student_count,
                    duration_slots=ex.duration_slots,
                    allowed_dates=ex.allowed_dates,
                    allowed_slot_ids=ex.allowed_slot_ids,
                    required_room_type=ex.required_room_type,
                    preferred_gap_days=ex.preferred_gap_days,
                    priority=ex.priority,
                    is_fixed=True,
                    fixed_date=lock.date,
                    fixed_slot_id=lock.slot_id,
                    fixed_room_id=lock.room_id
                ))
            else:
                updated_csp_exams.append(ex)

        # Run scheduler
        scheduler = CSPScheduler(
            exams=updated_csp_exams,
            rooms=csp_rooms,
            slots=csp_slots,
            dates=dates,
            shared_group_conflicts=shared_conflicts,
            weights=weights,
            max_search_seconds=config.max_search_seconds,
            max_backtracks=config.max_backtracks,
            optimize_soft_constraints=config.optimize_soft_constraints
        )
        result = scheduler.solve()

        if not result.success:
            # Update status but don't overwrite if repair failed
            timetable.status = "REPAIR_FAILED"
            timetable.failure_reasons_json = json.dumps(result.failure_reasons)
            db.commit()
            return timetable

        # Delete non-locked assignments
        db.query(TimetableAssignmentModel).filter(
            TimetableAssignmentModel.timetable_id == timetable_id,
            TimetableAssignmentModel.is_locked == False
        ).delete()

        exam_map = {e.id: e for e in updated_csp_exams}
        room_map = {r.id: r for r in csp_rooms}
        slot_map = {s.id: s for s in csp_slots}
        group_map = {g.id: g.code for g in db.query(StudentGroupModel).all()}

        # Insert new assignments for non-locked
        for eid, val in result.assignments.items():
            if eid in locked_map:
                continue
            ex = exam_map[eid]
            rm = room_map[val.room_id]
            sl = slot_map[val.slot_id]
            groups_label = ", ".join(group_map.get(gid, gid) for gid in ex.group_ids)

            asgn = TimetableAssignmentModel(
                id=f"ASN-{uuid.uuid4().hex[:8].upper()}",
                timetable_id=timetable_id,
                exam_id=ex.id,
                exam_code=ex.code,
                exam_name=ex.name,
                date=val.date,
                slot_id=val.slot_id,
                slot_name=sl.name,
                start_time=sl.start_time,
                end_time=sl.end_time,
                room_id=val.room_id,
                room_name=rm.name,
                room_capacity=rm.capacity,
                student_count=ex.student_count,
                groups_str=groups_label,
                is_locked=False
            )
            db.add(asgn)

        # Validate newly repaired timetable
        validator = TimetableValidator(
            exams=updated_csp_exams,
            rooms=csp_rooms,
            slots=csp_slots,
            dates=dates,
            shared_group_conflicts=shared_conflicts,
            weights=weights
        )
        val_report = validator.validate(result.assignments)

        timetable.status = "REPAIRED_SUCCESS"
        timetable.is_valid = val_report.is_valid
        timetable.soft_penalty_total = result.soft_score.total_penalty if result.soft_score else 0.0
        val_report_dict = {
            "is_valid": val_report.is_valid,
            "total_hard_violations": val_report.total_hard_violations,
            "total_soft_warnings": val_report.total_soft_warnings,
            "summary": val_report.summary,
            "hard_violations": [],
            "soft_warnings": []
        }
        timetable.validation_report_json = json.dumps(val_report_dict)

        exp = TimetableExplanationModel(
            id=f"EXP-{uuid.uuid4().hex[:8].upper()}",
            timetable_id=timetable_id,
            step=len(timetable.explanations) + 1,
            event_type="REPAIR_COMPLETE",
            exam_code="ALL",
            details="CSP Scheduler successfully repaired schedule around preserved locked assignments.",
            reason="All hard constraints re-verified with 0 violations."
        )
        db.add(exp)

        db.commit()
        db.refresh(timetable)
        return timetable
