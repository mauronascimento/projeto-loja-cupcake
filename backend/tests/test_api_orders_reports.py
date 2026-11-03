from __future__ import annotations

from datetime import datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

ADDRESS = {
    "cep": "01310100",
    "logradouro": "Avenida Paulista",
    "numero": "1000",
    "complemento": None,
    "bairro": "Bela Vista",
    "cidade": "São Paulo",
    "uf": "SP",
}


def register_customer(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "nome_completo": "Cliente de Relatório",
            "telefone": "11987654321",
            "email": f"{uuid4().hex}@example.com",
            "senha": "senha-segura-com-12",
            "endereco": ADDRESS,
        },
    )
    assert response.status_code == 201, response.text


def place_order(client, product_id, method):
    response = client.post(
        "/api/v1/orders",
        headers={"Idempotency-Key": str(uuid4())},
        json={
            "items": [
                {
                    "produto_id": product_id,
                    "quantidade": 2,
                    "preco_unitario_esperado": "12.90",
                }
            ],
            "forma_pagamento": method,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_order_listing_validation_visibility_and_status_flow(admin_client):
    product = admin_client.post(
        "/api/v1/admin/products",
        json={
            "nome": "Cupcake de Pedidos",
            "descricao": "Um cupcake artesanal para validar pedidos.",
            "preco": "12.90",
            "quantidade_inicial": 12,
        },
    ).json()
    register_customer(admin_client)
    order = place_order(admin_client, product["id"], "PIX")

    customer_list = admin_client.get("/api/v1/orders")
    assert customer_list.status_code == 200
    assert customer_list.json()["total"] == 1
    assert customer_list.json()["items"][0]["id"] == order["id"]
    own_order = admin_client.get(f"/api/v1/orders/{order['id']}")
    assert own_order.status_code == 200
    assert own_order.headers["cache-control"] == "no-store"
    assert own_order.json()["nome_cliente"] is None
    assert admin_client.get("/api/v1/orders/9999").status_code == 404

    invalid_key = admin_client.post(
        "/api/v1/orders",
        headers={"Idempotency-Key": "not-a-uuid"},
        json={
            "items": [
                {
                    "produto_id": product["id"],
                    "quantidade": 1,
                    "preco_unitario_esperado": "12.90",
                }
            ],
            "forma_pagamento": "PIX",
        },
    )
    assert invalid_key.status_code == 422
    missing_key = admin_client.post(
        "/api/v1/orders",
        json={
            "items": [
                {
                    "produto_id": product["id"],
                    "quantidade": 1,
                    "preco_unitario_esperado": "12.90",
                }
            ],
            "forma_pagamento": "PIX",
        },
    )
    assert missing_key.status_code == 422

    admin_client.post("/api/v1/auth/logout")
    admin_client.post(
        "/api/v1/auth/login",
        json={"email": "admin-test@example.com", "senha": "senha-admin-de-teste"},
    )
    admin_list = admin_client.get(
        "/api/v1/admin/orders?status=EM_PREPARACAO&limit=1&offset=0"
    )
    assert admin_list.status_code == 200
    assert admin_list.json()["items"][0]["nome_cliente"] == "Cliente de Relatório"
    assert admin_client.get("/api/v1/admin/orders?status=NAO_EXISTE").status_code == 422
    assert (
        admin_client.get("/api/v1/admin/orders?data_inicio=2026-01-01").status_code
        == 422
    )
    assert (
        admin_client.get(
            "/api/v1/admin/orders?data_inicio=invalida&data_fim=2026-01-01"
        ).status_code
        == 422
    )
    assert (
        admin_client.get(
            "/api/v1/admin/orders?data_inicio=2026-02-02&data_fim=2026-02-01"
        ).status_code
        == 422
    )
    assert admin_client.get("/api/v1/admin/orders/9999").status_code == 404

    advanced = admin_client.patch(
        f"/api/v1/admin/orders/{order['id']}/status",
        json={"status": "SAIU_PARA_ENTREGA"},
    )
    assert advanced.status_code == 200
    delivered = admin_client.patch(
        f"/api/v1/admin/orders/{order['id']}/status", json={"status": "ENTREGUE"}
    )
    assert delivered.status_code == 200
    assert delivered.json()["status"] == "ENTREGUE"
    assert delivered.json()["entregue_em"] is not None
    assert (
        admin_client.patch(
            f"/api/v1/admin/orders/{order['id']}/status",
            json={"status": "ENTREGUE"},
        ).status_code
        == 409
    )
    assert (
        admin_client.post(f"/api/v1/orders/{order['id']}/cancel", json={}).status_code
        == 409
    )


def test_customer_cannot_read_other_customer_order(admin_client):
    product = admin_client.post(
        "/api/v1/admin/products",
        json={
            "nome": "Cupcake Privado",
            "descricao": "Um cupcake artesanal para validar privacidade.",
            "preco": "12.90",
            "quantidade_inicial": 5,
        },
    ).json()
    register_customer(admin_client)
    order = place_order(admin_client, product["id"], "PIX")
    admin_client.post("/api/v1/auth/logout")
    second_customer = admin_client.post(
        "/api/v1/auth/register",
        json={
            "nome_completo": "Outro Cliente",
            "telefone": "11912345678",
            "email": f"{uuid4().hex}@example.com",
            "senha": "outra-senha-segura-12",
            "endereco": ADDRESS,
        },
    )
    assert second_customer.status_code == 201
    assert admin_client.get(f"/api/v1/orders/{order['id']}").status_code == 404


def test_reports_cover_empty_populated_daily_monthly_and_validation(
    admin_client,
):
    today = datetime.now(ZoneInfo("America/Sao_Paulo")).date().isoformat()
    query = f"data_inicio={today}&data_fim={today}"
    empty_dashboard = admin_client.get(f"/api/v1/admin/dashboard?{query}")
    assert empty_dashboard.status_code == 200
    assert empty_dashboard.json()["valor_vendas_concluidas"] == "0.00"
    assert empty_dashboard.json()["ticket_medio"] == "0.00"
    assert empty_dashboard.json()["por_status"]["ENTREGUE"] == 0

    empty_sales = admin_client.get(f"/api/v1/admin/reports/sales?{query}")
    assert empty_sales.json()["totais"]["ticket_medio"] == "0.00"
    assert empty_sales.json()["series"][0]["valor"] == "0.00"
    assert (
        admin_client.get(
            f"/api/v1/admin/reports/sales?{query}&group_by=invalid"
        ).status_code
        == 422
    )
    assert (
        admin_client.get(
            "/api/v1/admin/reports/sales?data_inicio=2020-01-01&data_fim=2022-01-02"
        ).status_code
        == 422
    )
    assert (
        admin_client.get(
            "/api/v1/admin/reports/sales?data_inicio=2010-01-01&data_fim=2021-01-02"
            "&group_by=month"
        ).status_code
        == 422
    )
    assert (
        admin_client.get("/api/v1/admin/reports/products?limit=1").json()["items"] == []
    )
    empty_payments = admin_client.get("/api/v1/admin/reports/payments").json()
    assert empty_payments["total_registros"] == 0
    assert {item["forma_pagamento"] for item in empty_payments["items"]} == {
        "PIX",
        "CARTAO",
        "DINHEIRO",
    }

    product = admin_client.post(
        "/api/v1/admin/products",
        json={
            "nome": "Cupcake para Relatório",
            "descricao": "Um cupcake artesanal para relatórios.",
            "preco": "12.90",
            "quantidade_inicial": 10,
        },
    ).json()
    register_customer(admin_client)
    delivered = place_order(admin_client, product["id"], "PIX")
    cancelled = place_order(admin_client, product["id"], "DINHEIRO")

    admin_client.post("/api/v1/auth/logout")
    admin_client.post(
        "/api/v1/auth/login",
        json={"email": "admin-test@example.com", "senha": "senha-admin-de-teste"},
    )
    admin_client.patch(
        f"/api/v1/admin/orders/{delivered['id']}/status",
        json={"status": "SAIU_PARA_ENTREGA"},
    )
    admin_client.patch(
        f"/api/v1/admin/orders/{delivered['id']}/status",
        json={"status": "ENTREGUE"},
    )
    admin_client.post(
        f"/api/v1/orders/{cancelled['id']}/cancel",
        json={"motivo_cancelamento": "Teste de relatório"},
    )

    dashboard = admin_client.get(f"/api/v1/admin/dashboard?{query}").json()
    assert dashboard["pedidos_criados"] == 2
    assert dashboard["pedidos_entregues"] == 1
    assert dashboard["unidades_vendidas"] == 2
    assert dashboard["valor_vendas_concluidas"] == "25.80"
    assert dashboard["ticket_medio"] == "25.80"

    daily = admin_client.get(f"/api/v1/admin/reports/sales?{query}").json()
    assert daily["totais"]["pedidos"] == 1
    assert daily["series"][0]["unidades"] == 2
    monthly = admin_client.get(
        f"/api/v1/admin/reports/sales?{query}&group_by=month"
    ).json()
    assert monthly["series"][0]["periodo"] == today[:7]

    products = admin_client.get(
        f"/api/v1/admin/reports/products?{query}&limit=1"
    ).json()
    assert products["items"][0]["nome"] == "Cupcake para Relatório"
    assert products["items"][0]["quantidade"] == 2

    payments = admin_client.get(f"/api/v1/admin/reports/payments?{query}").json()
    assert payments["total_registros"] == 2
    assert payments["valor_total_demonstrativo"] == "51.60"
    grouped = {item["forma_pagamento"]: item for item in payments["items"]}
    assert grouped["PIX"]["quantidade"] == 1
    assert grouped["DINHEIRO"]["quantidade"] == 1
    assert grouped["CARTAO"]["quantidade"] == 0
