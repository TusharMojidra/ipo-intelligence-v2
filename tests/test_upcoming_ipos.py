import pytest
from fastapi.testclient import TestClient
from api import app, initialize_models, STATE

client = TestClient(app)

def test_upcoming_ipos_filtering_and_predictions():
    """Verify upcoming IPOs only include active/upcoming/awaiting-listing IPOs and have predictions."""
    if "clf" not in STATE:
        initialize_models()

    response = client.get("/api/upcoming-ipos")
    assert response.status_code == 200
    data = response.json()

    ipos = data.get("ipos", [])
    assert len(ipos) > 0

    allowed_statuses = {"Bidding Open", "Bidding Closed", "Allotment Awaited", "Upcoming", "Pre-IPO Filed"}

    for ipo in ipos:
        # 1. Status must be an active upcoming/bidding/awaiting-listing status
        assert ipo["status"] in allowed_statuses, f"Invalid status: {ipo['status']} for {ipo['company_name']}"

        # 2. Must not be already listed
        assert "@" not in ipo["company_name"], f"Listed tag in company name: {ipo['company_name']}"
        assert "[email" not in ipo["company_name"]

        # 3. If Bidding Closed or has subscription data, predicted_gain and predicted_range must exist
        if ipo["status"] in ("Bidding Closed", "Allotment Awaited") or (ipo.get("total") and ipo["total"] > 0):
            assert "predicted_gain" in ipo, f"Missing predicted_gain for {ipo['company_name']}"
            assert "predicted_range" in ipo, f"Missing predicted_range for {ipo['company_name']}"
            assert isinstance(ipo["predicted_gain"], (int, float))

        # 4. Phase 1 hot_probability must be present for all
        assert "hot_probability" in ipo
        assert 0.0 <= ipo["hot_probability"] <= 100.0


def test_upcoming_ipo_with_phase2_inputs_predicts_both():
    """Verify that an IPO with QIB, HNI, RII, and Total executes full Phase 1 + Phase 2 prediction."""
    if "clf" not in STATE:
        initialize_models()

    payload = {
        "company_name": "Afcons Infrastructure Limited",
        "issue_size": 5430.0,
        "offer_price": 463.0,
        "qib": 3.79,
        "hni": 5.05,
        "rii": 0.94,
        "total": 2.63,
        "nifty_30d_return": 2.5,
        "nifty_volatility": 13.5,
        "trailing_5_gain": 24.5,
        "trailing_ipo_count": 8,
        "year": 2026,
        "month": 11
    }

    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    result = response.json()

    # Both Phase 1 and Phase 2 outputs must be present
    assert "hot_probability" in result
    assert "expected_gain" in result
    assert "predicted_range" in result
    assert "range_lower" in result
    assert "range_upper" in result
    assert "models_breakdown" in result
    assert len(result["models_breakdown"]) >= 5
