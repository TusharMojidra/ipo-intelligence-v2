import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/app.db")

# SQLAlchemy 2.0 requires postgresql:// instead of postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Ensure data directory exists if sqlite
if DATABASE_URL.startswith("sqlite:///./"):
    db_relative_path = DATABASE_URL.replace("sqlite:///./", "")
    db_dir = os.path.dirname(db_relative_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    import backend.models  # Ensure models are imported before create_all
    Base.metadata.create_all(bind=engine)

    # Safe dynamic column migrations across both PostgreSQL and SQLite
    with engine.begin() as conn:
        try:
            inspector = inspect(conn)
            existing_cols = {c["name"] for c in inspector.get_columns("users")}

            columns_to_add = [
                ("phone_number", "VARCHAR(30)"),
                ("avatar_url", "VARCHAR(500)"),
                ("auth_provider", "VARCHAR(50) DEFAULT 'local'"),
                ("google_id", "VARCHAR(255)"),
                ("phone_verified", "BOOLEAN DEFAULT FALSE" if "postgres" in DATABASE_URL else "BOOLEAN DEFAULT 0"),
                ("failed_login_attempts", "INTEGER DEFAULT 0"),
                ("locked_until", "TIMESTAMP WITH TIME ZONE" if "postgres" in DATABASE_URL else "DATETIME"),
                ("password_changed_at", "TIMESTAMP WITH TIME ZONE" if "postgres" in DATABASE_URL else "DATETIME"),
            ]

            for col_name, col_def in columns_to_add:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}"))
        except Exception as e:
            print(f"Migration note: {e}")
