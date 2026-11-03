import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@pytest.fixture
def api_client():
    from app.database import get_db
    from app.main import app
    from app.models import Base

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)

    def override_get_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    client.headers["Origin"] = "http://localhost:3000"
    try:
        yield client
    finally:
        client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture
def database_session(api_client):
    from app.database import get_db
    from app.main import app

    generator = app.dependency_overrides[get_db]()
    db = next(generator)
    try:
        yield db
    finally:
        generator.close()


@pytest.fixture
def admin_client(api_client, database_session):
    from app.models import User, UserRole
    from app.utils.security import hash_password

    database_session.add(
        User(
            nome_completo="Administrador de Teste",
            telefone="11912345678",
            email="admin-test@example.com",
            senha_hash=hash_password("senha-admin-de-teste"),
            perfil=UserRole.ADMIN,
            cep="01310100",
            logradouro="Avenida Paulista",
            numero="1000",
            complemento=None,
            bairro="Bela Vista",
            cidade="São Paulo",
            uf="SP",
            ativo=True,
        )
    )
    database_session.commit()
    response = api_client.post(
        "/api/v1/auth/login",
        json={"email": "admin-test@example.com", "senha": "senha-admin-de-teste"},
    )
    assert response.status_code == 200, response.text
    return api_client
