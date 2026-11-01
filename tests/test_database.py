import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
from backend.db import Base
from backend.models import User, UserWatchlist, SavedSimulation, AuthAuditLog

# Setup an isolated in-memory SQLite database for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

def test_create_user(db_session):
    user = User(
        email="trader@example.com",
        full_name="Alpha Trader",
        hashed_password="secure_hashed_password_123"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.id is not None
    assert user.email == "trader@example.com"
    assert user.full_name == "Alpha Trader"
    assert user.is_active is True
    assert user.role == "user"

def test_unique_user_email(db_session):
    u1 = User(email="unique@test.com", hashed_password="pw1")
    u2 = User(email="unique@test.com", hashed_password="pw2")
    db_session.add(u1)
    db_session.commit()

    db_session.add(u2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

def test_user_watchlist_and_cascade(db_session):
    user = User(email="watchlist@test.com", hashed_password="pw")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    item1 = UserWatchlist(user_id=user.id, company_name="Tata Technologies", symbol="TATATECH")
    db_session.add(item1)
    db_session.commit()

    # Query items
    items = db_session.query(UserWatchlist).filter_by(user_id=user.id).all()
    assert len(items) == 1
    assert items[0].company_name == "Tata Technologies"

    # Test unique constraint (same company for same user)
    dup = UserWatchlist(user_id=user.id, company_name="Tata Technologies")
    db_session.add(dup)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # Test cascade delete
    db_session.delete(user)
    db_session.commit()
    assert db_session.query(UserWatchlist).filter_by(user_id=user.id).count() == 0

def test_saved_simulation_and_audit(db_session):
    user = User(email="sim@test.com", hashed_password="pw")
    db_session.add(user)
    db_session.commit()

    sim = SavedSimulation(
        user_id=user.id,
        title="High GMP IPO Scenario",
        inputs_json='{"gmp": 60, "qib": 45}',
        results_json='{"predicted_gain": 42.5}'
    )
    audit = AuthAuditLog(
        user_id=user.id,
        action="LOGIN_SUCCESS",
        ip_address="127.0.0.1",
        user_agent="pytest"
    )
    db_session.add_all([sim, audit])
    db_session.commit()

    assert db_session.query(SavedSimulation).count() == 1
    assert db_session.query(AuthAuditLog).count() == 1
