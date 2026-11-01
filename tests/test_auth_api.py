import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from api import app, initialize_models, STATE
from backend.db import Base, get_db

# Isolated test DB with StaticPool to keep in-memory SQLite persistent across threads/sessions
TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def setup_test_suite():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    if "clf" not in STATE:
        initialize_models()
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def client():
    return TestClient(app)

def test_user_registration_and_login_flow(client):
    email = "trader_test@terminal.ai"
    password = "SuperSecurePassword123"

    # 1. Register
    reg_res = client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Pro Trader"
    })
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == email
    assert reg_data["user"]["full_name"] == "Pro Trader"

    token = reg_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Duplicate registration should fail
    dup_res = client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Pro Trader"
    })
    assert dup_res.status_code == 400

    # 3. Login with wrong password
    bad_login = client.post("/api/auth/login", json={
        "email": email,
        "password": "WrongPassword999"
    })
    assert bad_login.status_code == 401

    # 4. Login with correct password
    good_login = client.post("/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert good_login.status_code == 200
    assert "access_token" in good_login.json()

    # 5. Access /api/auth/me
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email

    # 6. Access /api/auth/me without token -> 401
    anon_res = client.get("/api/auth/me")
    assert anon_res.status_code == 401

def test_user_watchlist_flow(client):
    email = "watchuser@terminal.ai"
    password = "Password12345"
    reg = client.post("/api/auth/register", json={"email": email, "password": password})
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add to watchlist
    add_res = client.post("/api/user/watchlist", headers=headers, json={
        "company_name": "Bajaj Housing Finance",
        "symbol": "BAJAJHFL"
    })
    assert add_res.status_code == 201
    assert add_res.json()["company_name"] == "Bajaj Housing Finance"

    # Get watchlist
    list_res = client.get("/api/user/watchlist", headers=headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 1
    assert items[0]["company_name"] == "Bajaj Housing Finance"

    # Delete from watchlist
    del_res = client.delete("/api/user/watchlist/Bajaj%20Housing%20Finance", headers=headers)
    assert del_res.status_code == 200

    # Verify empty
    list_after = client.get("/api/user/watchlist", headers=headers)
    assert len(list_after.json()) == 0

def test_user_simulation_vault_flow(client):
    email = "simuser@terminal.ai"
    password = "Password12345"
    reg = client.post("/api/auth/register", json={"email": email, "password": password})
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Save simulation
    save_res = client.post("/api/user/simulations", headers=headers, json={
        "title": "High GMP Tech Unicorn",
        "inputs": {"gmp": 75.0, "qib": 120.0},
        "results": {"expected_gain": 58.4, "direction": "Positive"}
    })
    assert save_res.status_code == 201
    sim_id = save_res.json()["id"]

    # Get saved simulations
    sims_res = client.get("/api/user/simulations", headers=headers)
    assert sims_res.status_code == 200
    sim_list = sims_res.json()
    assert len(sim_list) == 1
    assert sim_list[0]["title"] == "High GMP Tech Unicorn"
    assert sim_list[0]["inputs"]["gmp"] == 75.0

    # Delete simulation
    del_res = client.delete(f"/api/user/simulations/{sim_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify empty
    assert len(client.get("/api/user/simulations", headers=headers).json()) == 0

def test_google_authentication_flow(client):
    # 1. First time Google login -> auto-create profile
    google_email = "new_investor@gmail.com"
    res1 = client.post("/api/auth/google", json={
        "credential": "mock_google_jwt_token",
        "user_info": {
            "email": google_email,
            "name": "Arjun Mehta",
            "sub": "google-oauth2-1082348912",
            "picture": "https://lh3.googleusercontent.com/a/mock_avatar"
        }
    })
    assert res1.status_code == 200
    data1 = res1.json()
    assert "access_token" in data1
    assert data1["user"]["email"] == google_email
    assert data1["user"]["full_name"] == "Arjun Mehta"
    assert data1["user"]["auth_provider"] == "google"
    assert data1["user"]["is_verified"] is True

    # 2. Subsequent Google login -> seamlessly returns token for existing user
    res2 = client.post("/api/auth/google", json={
        "credential": "mock_google_jwt_token",
        "user_info": {
            "email": google_email,
            "name": "Arjun Mehta",
            "sub": "google-oauth2-1082348912",
            "picture": "https://lh3.googleusercontent.com/a/mock_avatar"
        }
    })
    assert res2.status_code == 200
    assert res2.json()["user"]["id"] == data1["user"]["id"]

def test_mobile_registration_and_otp_flow(client):
    mobile = "+91 98765 43210"
    email = "mobile_user@terminal.ai"
    password = "MobilePassword123"

    # 1. Send OTP for mobile number
    otp_req = client.post("/api/auth/send-otp", json={
        "target": mobile,
        "purpose": "login"
    })
    assert otp_req.status_code == 200
    otp_data = otp_req.json()
    assert "dev_otp" in otp_data
    dev_code = otp_data["dev_otp"]

    # 2. Verify OTP and login / create profile
    verify_res = client.post("/api/auth/verify-otp", json={
        "target": mobile,
        "otp_code": dev_code,
        "purpose": "login",
        "full_name": "Priya Sharma"
    })
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert "access_token" in v_data
    assert v_data["user"]["phone_number"] == "9876543210"
    assert v_data["user"]["phone_verified"] is True

    # 3. Register user with mobile and password
    reg_res = client.post("/api/auth/register", json={
        "email": email,
        "phone_number": "9123456780",
        "password": password,
        "full_name": "Rohan Deshmukh"
    })
    assert reg_res.status_code == 201
    assert reg_res.json()["user"]["phone_number"] == "9123456780"

    # 4. Login using Mobile Number instead of Email
    login_phone_res = client.post("/api/auth/login", json={
        "identifier": "9123456780",
        "password": password
    })
    assert login_phone_res.status_code == 200
    assert login_phone_res.json()["user"]["email"] == email
