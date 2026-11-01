import pytest
from fastapi.testclient import TestClient
from api import app, initialize_models, STATE
from backend.db import init_db

# Ensure database tables and ML models are loaded before running tests
@pytest.fixture(scope="module", autouse=True)
def setup_models():
    init_db()
    if "clf" not in STATE:
        initialize_models()

@pytest.fixture
def client():
    return TestClient(app)

def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["version"] == "2.0"
    assert data["models_loaded"] is True

def test_api_status(client):
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"

    # Authenticated status check gives full model metadata
    reg_res = client.post("/api/auth/register", json={
        "email": "status_admin_test@terminal.ai",
        "password": "Password123!"
    })
    if reg_res.status_code == 200:
        token = reg_res.json()["access_token"]
    else:
        login_res = client.post("/api/auth/login", json={
            "email": "status_admin_test@terminal.ai",
            "password": "Password123!"
        })
        token = login_res.json()["access_token"]
    auth_res = client.get("/api/status", headers={"Authorization": f"Bearer {token}"})
    assert auth_res.status_code == 200
    auth_data = auth_res.json()
    assert "models" in auth_data
    assert "performance" in auth_data
    assert "directional_accuracy" in auth_data["performance"]
    assert "range_bucket_accuracy_80" in auth_data["performance"]

def test_api_recent_ipos(client):
    res = client.get("/api/recent-ipos")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "company_name" in data[0]

def test_api_history(client):
    res = client.get("/api/history")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if len(data) > 0:
        assert "IPO_Name" in data[0]
        assert "Actual_Gain" in data[0]

def test_api_upcoming_ipos(client):
    res = client.get("/api/upcoming-ipos")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "ipos" in data
    assert len(data["ipos"]) > 0
    first_ipo = data["ipos"][0]
    assert "company_name" in first_ipo
    assert "issue_size" in first_ipo
    assert "offer_price" in first_ipo
    assert "status" in first_ipo
    assert "category" in first_ipo

def test_predict_phase1_endpoint(client):
    payload = {
        "company_name": "NTPC Green Energy",
        "issue_size": 10000.0,
        "offer_price": 108.0,
        "nifty_30d_return": 2.2,
        "nifty_volatility": 12.5,
        "trailing_5_gain": 25.0
    }
    res = client.post("/api/predict/phase1", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["company_name"] == "NTPC Green Energy"
    assert "direction" in data
    assert "hot_probability" in data
    assert "models_breakdown" in data
    assert data["is_phase2_available"] is False
    assert "phase2_notice" in data

def test_predict_endpoint_valid(client):
    payload = {
        "company_name": "Bajaj Housing Finance",
        "issue_size": 6560.0,
        "offer_price": 70.0,
        "qib": 222.0,
        "hni": 43.5,
        "rii": 7.4,
        "total": 67.4,
        "nifty_30d_return": 2.8,
        "nifty_5d_return": 0.8,
        "nifty_volatility": 12.5,
        "nifty_52w_dist": -2.5,
        "nifty_bull_regime": 1,
        "trailing_5_gain": 35.0,
        "trailing_ipo_count": 8,
        "year": 2026,
        "month": 10
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["company_name"] == "Bajaj Housing Finance"
    assert "direction" in data
    assert "HOT" in data["direction"]
    assert data["hot_probability"] > 50.0
    assert "expected_gain" in data
    assert "range_lower" in data
    assert "range_upper" in data
    assert data["range_upper"] >= data["range_lower"]
    assert "benchmarks" in data
    assert "Huber (Best Model)" in data["benchmarks"]
    assert "corridor_10" in data
    assert "corridor_15" in data
    assert isinstance(data["key_drivers"], list)

def test_predict_weak_demand(client):
    payload = {
        "company_name": "Weak IPO",
        "issue_size": 500.0,
        "offer_price": 100.0,
        "qib": 0.4,
        "hni": 0.2,
        "rii": 0.5,
        "total": 0.4,
        "nifty_30d_return": -4.5,
        "nifty_bull_regime": 0,
        "trailing_5_gain": -10.0,
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "expected_gain" in data
    # Weak demand with QIB < 1x leads to low expected gain compared to hot IPOs (>60%)
    assert data["expected_gain"] < 10.0

def test_predict_validation_error(client):
    payload = {
        "company_name": "Invalid IPO",
        "issue_size": -10.0,  # Invalid: ge=1.0 constraint
        "offer_price": 50.0,
        "qib": 10.0,
        "hni": 5.0,
        "rii": 2.0,
        "total": 6.0
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 422  # Unprocessable Entity

def test_sensitivity_endpoint(client):
    payload = {
        "company_name": "Sensitivity Test IPO",
        "issue_size": 1500.0,
        "offer_price": 250.0,
        "qib": 20.0,
        "hni": 10.0,
        "rii": 5.0,
        "total": 12.0,
        "nifty_30d_return": 2.0
    }
    res = client.post("/api/sensitivity", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["company_name"] == "Sensitivity Test IPO"
    assert "qib_curve" in data
    assert len(data["qib_curve"]) > 5
    assert "shock_matrix" in data
    assert len(data["shock_matrix"]) == 5
    assert all("expected_gain" in point for point in data["qib_curve"])

def test_robots_txt(client):
    res = client.get("/robots.txt")
    assert res.status_code == 200
    assert "User-agent: *" in res.text
    assert "Sitemap:" in res.text

def test_sitemap_xml(client):
    res = client.get("/sitemap.xml")
    assert res.status_code == 200
    assert "<?xml" in res.text
    assert "<loc>" in res.text

def test_security_headers(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("x-frame-options") == "DENY"
    assert res.headers.get("referrer-policy") == "strict-origin-when-cross-origin"


def test_contact_info_endpoint(client):
    res = client.get("/api/contact")
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "ipo.intelligence.app@gmail.com"
    assert "channels" in data
    assert "bugs" in data["channels"]


def test_feedback_submission_endpoint(client):
    payload = {
        "name": "Arun Kumar",
        "email": "arun@example.com",
        "category": "bug",
        "subject": "Testing feedback route",
        "message": "Encountered a display discrepancy on mobile browser",
        "rating": 5
    }
    res = client.post("/api/feedback", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "feedback_id" in data
    assert data["feedback_id"].startswith("FB-")
    assert data["target_email"] == "ipo.intelligence.app@gmail.com"
    assert "delivery_status" in data


def test_feedback_validation_errors(client):
    # Invalid email
    res = client.post("/api/feedback", json={
        "email": "not-an-email",
        "category": "bug",
        "subject": "Missing",
        "message": "Valid text"
    })
    assert res.status_code == 422


