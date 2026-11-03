from __future__ import annotations

from uuid import uuid4

from app.models import Session as UserSession

ADDRESS = {
    "cep": "01310100",
    "logradouro": "Avenida Paulista",
    "numero": "1000",
    "complemento": "Conjunto 10",
    "bairro": "Bela Vista",
    "cidade": "São Paulo",
    "uf": "SP",
}


def register_customer(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "nome_completo": "Cliente de Estoque",
            "telefone": "11987654321",
            "email": f"{uuid4().hex}@example.com",
            "senha": "senha-segura-com-12",
            "endereco": ADDRESS,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def create_product(client, stock=5):
    response = client.post(
        "/api/v1/admin/products",
        json={
            "nome": "Cupcake de Estoque",
            "descricao": "Um cupcake artesanal para movimentar estoque.",
            "preco": "12.90",
            "quantidade_inicial": stock,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_stock_adjustments_history_and_rejections(admin_client):
    product = create_product(admin_client)
    adjustment = admin_client.post(
        f"/api/v1/admin/products/{product['id']}/stock-adjustments",
        json={"variacao": 3, "observacao": "Reposição de teste"},
    )
    assert adjustment.status_code == 200
    assert adjustment.json()["quantidade_estoque"] == 8

    decrease = admin_client.post(
        f"/api/v1/admin/products/{product['id']}/stock-adjustments",
        json={"variacao": -2, "observacao": "Ajuste de contagem"},
    )
    assert decrease.status_code == 200
    assert decrease.json()["quantidade_estoque"] == 6

    conflict = admin_client.post(
        f"/api/v1/admin/products/{product['id']}/stock-adjustments",
        json={"variacao": -99, "observacao": "Saída excessiva"},
    )
    assert conflict.status_code == 409
    assert conflict.json()["detail"]["code"] == "STOCK_CONFLICT"
    assert (
        admin_client.post(
            f"/api/v1/admin/products/{product['id']}/stock-adjustments",
            json={"variacao": 0, "observacao": "Variação zero"},
        ).status_code
        == 422
    )
    assert (
        admin_client.post(
            "/api/v1/admin/products/9999/stock-adjustments",
            json={"variacao": 1, "observacao": "Produto ausente"},
        ).status_code
        == 404
    )

    history = admin_client.get(
        f"/api/v1/admin/products/{product['id']}/stock-movements?limit=1"
    )
    assert history.status_code == 200
    assert history.json()["total"] == 3
    assert history.json()["items"][0]["tipo"] == "AJUSTE"
    all_history = admin_client.get(
        f"/api/v1/admin/products/{product['id']}/stock-movements?limit=10"
    ).json()
    assert {row["variacao"] for row in all_history["items"]} == {5, 3, -2}
    assert (
        admin_client.get("/api/v1/admin/products/9999/stock-movements").status_code
        == 404
    )


def test_stock_endpoints_enforce_admin_role(admin_client):
    product = create_product(admin_client)
    admin_client.post("/api/v1/auth/logout")
    register_customer(admin_client)
    assert (
        admin_client.get(
            f"/api/v1/admin/products/{product['id']}/stock-movements"
        ).status_code
        == 403
    )
    response = admin_client.post(
        f"/api/v1/admin/products/{product['id']}/stock-adjustments",
        json={"variacao": 1, "observacao": "Cliente sem permissão"},
    )
    assert response.status_code == 403


def test_user_profile_update_password_and_session_revocation(
    admin_client, database_session
):
    customer = register_customer(admin_client)
    update = admin_client.patch(
        "/api/v1/users/me",
        json={
            "nome_completo": "Cliente Atualizado",
            "telefone": "(11) 98888-7777",
            "endereco": {**ADDRESS, "numero": "200"},
        },
    )
    assert update.status_code == 200
    assert update.headers["cache-control"] == "no-store"
    assert update.json()["nome_completo"] == "Cliente Atualizado"
    assert update.json()["telefone"] == "11988887777"
    assert update.json()["endereco"]["numero"] == "200"

    wrong_password = admin_client.put(
        "/api/v1/users/me/password",
        json={"senha_atual": "senha-errada", "nova_senha": "nova-senha-segura-12"},
    )
    assert wrong_password.status_code == 400
    assert wrong_password.json()["detail"]["code"] == "INVALID_CURRENT_PASSWORD"
    same_password = admin_client.put(
        "/api/v1/users/me/password",
        json={
            "senha_atual": "senha-segura-com-12",
            "nova_senha": "senha-segura-com-12",
        },
    )
    assert same_password.status_code == 422

    changed = admin_client.put(
        "/api/v1/users/me/password",
        json={
            "senha_atual": "senha-segura-com-12",
            "nova_senha": "nova-senha-segura-12",
        },
    )
    assert changed.status_code == 204
    assert admin_client.get("/api/v1/auth/me").status_code == 401
    sessions = (
        database_session.query(UserSession).filter_by(usuario_id=customer["id"]).all()
    )
    assert len(sessions) == 1
    assert sessions[0].revogada_em is not None
    login = admin_client.post(
        "/api/v1/auth/login",
        json={
            "email": sessions[0].usuario.email,
            "senha": "nova-senha-segura-12",
        },
    )
    assert login.status_code == 200
    assert admin_client.get("/api/v1/auth/me").status_code == 200


def test_authentication_errors_and_logout_without_session(api_client, database_session):
    from app.models import User, UserRole
    from app.utils.security import hash_password

    invalid = api_client.post(
        "/api/v1/auth/login",
        json={"email": "missing@example.com", "senha": "senha-qualquer"},
    )
    assert invalid.status_code == 401
    database_session.add(
        User(
            nome_completo="Conta Inativa",
            telefone="11912345678",
            email="inactive@example.com",
            senha_hash=hash_password("senha-segura-com-12"),
            perfil=UserRole.CLIENTE,
            cep="01310100",
            logradouro="Avenida Paulista",
            numero="1000",
            complemento=None,
            bairro="Bela Vista",
            cidade="São Paulo",
            uf="SP",
            ativo=False,
        )
    )
    database_session.commit()
    inactive = api_client.post(
        "/api/v1/auth/login",
        json={"email": "inactive@example.com", "senha": "senha-segura-com-12"},
    )
    assert inactive.status_code == 401
    assert inactive.json()["detail"]["message"] == "E-mail ou senha inválidos."
    assert api_client.post("/api/v1/auth/logout").status_code == 204
    assert api_client.get("/api/v1/auth/me").status_code == 401


def test_registration_duplicate_email_and_validation(api_client):
    payload = {
        "nome_completo": "Cliente de Cadastro",
        "telefone": "11987654321",
        "email": "duplicate@example.com",
        "senha": "senha-segura-com-12",
        "endereco": ADDRESS,
    }
    assert api_client.post("/api/v1/auth/register", json=payload).status_code == 201
    api_client.post("/api/v1/auth/logout")
    duplicate = api_client.post("/api/v1/auth/register", json=payload)
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"]["code"] == "EMAIL_ALREADY_EXISTS"

    invalid = api_client.post(
        "/api/v1/auth/register",
        json={**payload, "telefone": "123", "email": "invalid@example.com"},
    )
    assert invalid.status_code == 422
