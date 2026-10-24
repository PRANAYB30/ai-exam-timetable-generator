import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import Base, engine

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    # Reset demo data for clean test runs
    resp = client.post("/api/demo/reset")
    assert resp.status_code == 200

def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "CSP" in data["engine"]

def test_demo_data_loaded():
    exams = client.get("/api/exams").json()
    rooms = client.get("/api/rooms").json()
    groups = client.get("/api/groups").json()
    slots = client.get("/api/slots").json()

    assert len(exams) >= 10
    assert len(rooms) >= 5
    assert len(groups) >= 5
    assert len(slots) >= 2

def test_generate_timetable_success():
    resp = client.post("/api/timetables/generate", json={"title": "Test Fall Schedule"})
    assert resp.status_code == 200
    data = resp.json()

    assert data["is_valid"] is True
    assert data["status"] in ["SUCCESS_OPTIMAL", "SUCCESS_FEASIBLE"]
    assert data["scheduled_exams"] == data["total_exams"]
    assert len(data["assignments"]) == data["total_exams"]
    assert data["validation_report"]["is_valid"] is True
    assert data["validation_report"]["total_hard_violations"] == 0
    assert len(data["explanations"]) > 0

def test_manual_edit_and_revalidation():
    # 1. Generate timetable
    gen_resp = client.post("/api/timetables/generate", json={"title": "Manual Edit Test"})
    tt = gen_resp.json()
    timetable_id = tt["id"]
    asgns = tt["assignments"]
    assert len(asgns) >= 2

    # 2. Pick first two assignments and force them into the EXACT same room and slot
    a1 = asgns[0]
    a2 = asgns[1]

    # Move a2 to a1's date, slot, and room -> creates room collision!
    edit_resp = client.patch(
        f"/api/timetables/{timetable_id}/assignments/{a2['id']}",
        json={
            "date": a1["date"],
            "slot_id": a1["slot_id"],
            "room_id": a1["room_id"]
        }
    )
    assert edit_resp.status_code == 200
    updated_tt = edit_resp.json()

    # Revalidation MUST flag the hard conflict!
    assert updated_tt["is_valid"] is False
    assert updated_tt["status"] == "MANUALLY_EDITED"
    assert updated_tt["validation_report"]["total_hard_violations"] > 0
    violations = updated_tt["validation_report"]["hard_violations"]
    issue_types = [v["issue_type"] for v in violations]
    assert "ROOM_COLLISION" in issue_types or "STUDENT_CLASH" in issue_types

def test_repair_timetable():
    # 1. Generate timetable
    gen_resp = client.post("/api/timetables/generate")
    tt = gen_resp.json()
    timetable_id = tt["id"]
    a1 = tt["assignments"][0]

    # Lock a1 to its slot
    client.patch(
        f"/api/timetables/{timetable_id}/assignments/{a1['id']}",
        json={"is_locked": True}
    )

    # 2. Trigger repair
    repair_resp = client.post(f"/api/timetables/{timetable_id}/repair")
    assert repair_resp.status_code == 200
    repaired_tt = repair_resp.json()
    assert repaired_tt["is_valid"] is True

def test_timetable_csv_export():
    gen_resp = client.post("/api/timetables/generate")
    timetable_id = gen_resp.json()["id"]

    export_resp = client.get(f"/api/timetables/{timetable_id}/export")
    assert export_resp.status_code == 200
    assert "text/csv" in export_resp.headers["content-type"]
    csv_text = export_resp.text
    assert "Date,Slot Name,Start Time" in csv_text
    assert "Operating Systems" in csv_text or "CS301" in csv_text
