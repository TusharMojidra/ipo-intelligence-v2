"""
Pytest configuration for IPO Intelligence Terminal test suite.
Strictly isolates database connections to an in-memory SQLite instance (StaticPool).
Guarantees tests NEVER touch the live production database (Neon).
"""
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Enforce in-memory SQLite and testing environment mode before any app imports
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["ENVIRONMENT"] = "testing"

import backend.db as db_module
from backend.db import Base, get_db
from api import app, initialize_models, STATE

# Create isolated test SQLite engine
TEST_SQLITE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_SQLITE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Monkey-patch backend.db module so any import of SessionLocal or engine uses test SQLite
db_module.engine = test_engine
db_module.SessionLocal = TestSessionLocal

def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Apply dependency override globally to FastAPI app
app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_suite():
    """Create all schema tables in memory and initialize ML models for the test session."""
    Base.metadata.create_all(bind=test_engine)
    if "clf" not in STATE:
        initialize_models()
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=test_engine)
