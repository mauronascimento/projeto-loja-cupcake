from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings

is_sqlite = settings.sqlalchemy_database_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}
in_memory_sqlite = settings.sqlalchemy_database_url in {
    "sqlite://",
    "sqlite:///:memory:",
}
pool_class = StaticPool if is_sqlite and in_memory_sqlite else None
engine = create_engine(
    settings.sqlalchemy_database_url,
    pool_pre_ping=True,
    connect_args=connect_args,
    **({"poolclass": pool_class} if pool_class else {}),
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
