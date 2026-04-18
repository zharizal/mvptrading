"""SQLAlchemy engine + session factory.

Single sqlite file on disk. Sync Session — good enough for the journal /
analytics workloads which are low-QPS. The hot-path poller/WS layer stays
async and does not touch the DB directly (it enqueues writes via a helper
that runs in a thread).
"""
from __future__ import annotations

from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings
from app.db.models import Base


def _resolve_db_url() -> str:
    settings = get_settings()
    db_path = Path(settings.db_path)
    if not db_path.is_absolute():
        db_path = (Path(__file__).resolve().parent.parent.parent / db_path).resolve()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{db_path.as_posix()}"


_engine = create_engine(
    _resolve_db_url(),
    echo=False,
    future=True,
    connect_args={
        "check_same_thread": False,
        "timeout": 15,
    },
)

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()

SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False, expire_on_commit=False)


def init_db() -> None:
    """Create tables if they don't exist. Idempotent."""
    Base.metadata.create_all(bind=_engine)


def get_engine():  # pragma: no cover - simple accessor
    return _engine


def session_scope() -> Session:
    """Return a new Session; caller is responsible for close()."""
    return SessionLocal()
