import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

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

    # Safe migration for existing SQLite database files
    if "sqlite" in DATABASE_URL:
        try:
            with engine.connect() as conn:
                cursor = conn.connection.cursor()
                cursor.execute("PRAGMA table_info(users)")
                existing_cols = {row[1] for row in cursor.fetchall()}

                new_columns = [
                    ("phone_number", "VARCHAR(30)"),
                    ("avatar_url", "VARCHAR(500)"),
                    ("auth_provider", "VARCHAR(50) DEFAULT 'local'"),
                    ("google_id", "VARCHAR(255)"),
                    ("phone_verified", "BOOLEAN DEFAULT 0"),
                ]

                for col_name, col_def in new_columns:
                    if col_name not in existing_cols:
                        cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")
                conn.connection.commit()
        except Exception:
            pass
