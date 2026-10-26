from decimal import Decimal
from uuid import uuid4

from app.database import get_db
from app.main import app
from app.models import Base, Product


def add_product(api_client, *, slug: str, stock: int, price: str = "12.90"):
    override = app.dependency_overrides[get_db]
    db_generator = override()
    db = next(db_generator)
    product = Product(
        slug=slug,
        nome=slug.replace("-", " ").title(),
        descricao="Cupcake de teste com cobertura artesanal.",
        preco=Decimal(price),
        imagem_path="fallback.svg",
        quantidade_estoque=stock,
        ativo=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    product_id = product.id
    db_generator.close()
    return product_id


def register_client(api_client):
    response = api_client.post(
        "/api/v1/auth/register",
        json={
            "nome_completo": "Cliente de Teste",
            "telefone": "11987654321",
            "email": f"{uuid4().hex}@example.com",
            "senha": "senha-segura-com-12",
            "endereco": {
                "cep": "01310100",
                "logradouro": "Avenida Paulista",
                "numero": "1000",
                "complemento": None,
                "bairro": "Bela Vista",
                "cidade": "São Paulo",
                "uf": "SP",
            },
        },
    )
    assert response.status_code == 201, response.text
    assert response.json()["perfil"] == "CLIENTE"
    return response


def test_registration_session_and_revocation(api_client):
    register_client(api_client)

    current_user = api_client.get("/api/v1/auth/me")
    assert current_user.status_code == 200
    assert current_user.json()["nome_completo"] == "Cliente de Teste"

    logout = api_client.post("/api/v1/auth/logout")
    assert logout.status_code == 204
    assert api_client.get("/api/v1/auth/me").status_code == 401


def test_checkout_is_idempotent_and_cancel_restores_stock_once(api_client):
    register_client(api_client)
    product_id = add_product(api_client, slug="teste-checkout", stock=8)
    key = str(uuid4())
    payload = {
        "items": [
            {
                "produto_id": product_id,
                "quantidade": 2,
                "preco_unitario_esperado": "12.90",
            }
        ],
        "forma_pagamento": "PIX",
    }
    headers = {"Idempotency-Key": key}

    first = api_client.post("/api/v1/orders", json=payload, headers=headers)
    replay = api_client.post("/api/v1/orders", json=payload, headers=headers)
    assert first.status_code == 201, first.text
    assert replay.status_code == 200, replay.text
    assert replay.json()["id"] == first.json()["id"]
    assert first.json()["valor_total"] == "25.80"

    cancelled = api_client.post(f"/api/v1/orders/{first.json()['id']}/cancel", json={})
    assert cancelled.status_code == 200, cancelled.text
    assert cancelled.json()["status"] == "CANCELADO"

    duplicate_cancel = api_client.post(
        f"/api/v1/orders/{first.json()['id']}/cancel", json={}
    )
    assert duplicate_cancel.status_code == 409

    db_generator = app.dependency_overrides[get_db]()
    db = next(db_generator)
    stock = db.query(Product.quantidade_estoque).filter_by(id=product_id).scalar()
    db_generator.close()
    assert stock == 8


def test_checkout_stock_conflict_does_not_partially_debit_products(api_client):
    register_client(api_client)
    stocked_id = add_product(api_client, slug="produto-com-saldo", stock=7)
    empty_id = add_product(api_client, slug="produto-esgotado", stock=0)
    response = api_client.post(
        "/api/v1/orders",
        headers={"Idempotency-Key": str(uuid4())},
        json={
            "items": [
                {
                    "produto_id": stocked_id,
                    "quantidade": 2,
                    "preco_unitario_esperado": "12.90",
                },
                {
                    "produto_id": empty_id,
                    "quantidade": 1,
                    "preco_unitario_esperado": "12.90",
                },
            ],
            "forma_pagamento": "DINHEIRO",
        },
    )
    assert response.status_code == 409

    db_generator = app.dependency_overrides[get_db]()
    db = next(db_generator)
    stocks = dict(
        db.query(Product.id, Product.quantidade_estoque).filter(
            Product.id.in_([stocked_id, empty_id])
        )
    )
    db_generator.close()
    assert stocks == {stocked_id: 7, empty_id: 0}


def test_origin_guard_rejects_untrusted_mutations(api_client):
    response = api_client.post(
        "/api/v1/auth/register",
        headers={"Origin": "https://untrusted.example"},
        json={},
    )
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "INVALID_ORIGIN"


def test_application_exposes_27_business_operations_and_seven_tables():
    paths = app.openapi()["paths"]
    operation_count = sum(
        1
        for path, methods in paths.items()
        if path != "/health"
        for method in methods
        if method in {"get", "post", "put", "patch", "delete"}
    )
    assert operation_count == 27
    assert len(Base.metadata.tables) == 7
