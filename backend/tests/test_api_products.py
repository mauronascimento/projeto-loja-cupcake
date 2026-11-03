from __future__ import annotations

import io

from PIL import Image

from app.config import settings
from app.models import Product


def create_product(client, *, name="Cupcake de Teste", stock=4):
    response = client.post(
        "/api/v1/admin/products",
        json={
            "nome": name,
            "descricao": "Um cupcake artesanal para testes.",
            "preco": "12.90",
            "quantidade_inicial": stock,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_product_catalog_search_admin_filters_and_missing_product(admin_client):
    active = create_product(admin_client)
    inactive = create_product(admin_client, name="Cupcake Inativo")
    admin_client.patch(
        f"/api/v1/admin/products/{inactive['id']}", json={"ativo": False}
    )

    public = admin_client.get("/api/v1/products?search=  artesanal  ")
    assert public.status_code == 200
    assert [item["id"] for item in public.json()["items"]] == [active["id"]]
    assert public.json()["total"] == 1

    listing = admin_client.get("/api/v1/admin/products?ativo=false&limit=1&offset=0")
    assert listing.status_code == 200
    assert listing.json()["items"][0]["id"] == inactive["id"]

    assert admin_client.get(f"/api/v1/products/{active['slug']}").status_code == 200
    assert admin_client.get("/api/v1/products/nao-existe").status_code == 404
    assert (
        admin_client.get(f"/api/v1/admin/products/{inactive['id']}").status_code == 200
    )
    assert admin_client.get("/api/v1/admin/products/9999").status_code == 404
    assert (
        admin_client.get("/api/v1/admin/products?search=sem-resultado").json()["total"]
        == 0
    )


def test_product_create_update_and_validation_errors(admin_client):
    created = create_product(admin_client, name="Cupcake São João", stock=3)
    assert created["slug"] == "cupcake-sao-joao"
    assert created["quantidade_estoque"] == 3

    updated = admin_client.patch(
        f"/api/v1/admin/products/{created['id']}",
        json={"nome": "Cupcake Junino", "preco": "15.50", "ativo": False},
    )
    assert updated.status_code == 200
    assert updated.json()["nome"] == "Cupcake Junino"
    assert updated.json()["preco"] == "15.50"
    assert updated.json()["ativo"] is False

    duplicate = admin_client.post(
        "/api/v1/admin/products",
        json={
            "nome": "Cupcake São João",
            "descricao": "Um cupcake artesanal para testes.",
            "preco": "12.90",
            "quantidade_inicial": 0,
        },
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"]["code"] == "SLUG_ALREADY_EXISTS"

    empty_slug = admin_client.post(
        "/api/v1/admin/products",
        json={
            "nome": "!!!",
            "descricao": "Um cupcake artesanal para testes.",
            "preco": "12.90",
            "quantidade_inicial": 0,
        },
    )
    assert empty_slug.status_code == 422
    assert (
        admin_client.patch(
            "/api/v1/admin/products/9999", json={"ativo": False}
        ).status_code
        == 404
    )


def test_product_images_serve_fallback_and_reject_invalid_images(
    admin_client, database_session, monkeypatch, tmp_path
):
    monkeypatch.setattr(settings, "media_root", str(tmp_path))
    product = create_product(admin_client)

    fallback = admin_client.get(f"/api/v1/products/{product['id']}/image")
    assert fallback.status_code == 200
    assert fallback.headers["content-type"] == "image/svg+xml"

    database_session.query(Product).filter_by(id=product["id"]).update(
        {"imagem_path": "../outside.svg"}
    )
    database_session.commit()
    traversal = admin_client.get(f"/api/v1/products/{product['id']}/image")
    assert traversal.status_code == 200
    assert traversal.headers["content-type"] == "image/svg+xml"
    assert admin_client.get("/api/v1/products/9999/image").status_code == 404

    invalid = admin_client.put(
        f"/api/v1/admin/products/{product['id']}/image",
        files={"file": ("invalid.jpg", b"not an image", "image/jpeg")},
    )
    assert invalid.status_code == 422
    assert invalid.json()["detail"]["code"] == "INVALID_IMAGE"

    oversized = admin_client.put(
        f"/api/v1/admin/products/{product['id']}/image",
        files={"file": ("large.jpg", b"x" * (3 * 1024 * 1024 + 1), "image/jpeg")},
    )
    assert oversized.status_code == 413
    assert oversized.json()["detail"]["code"] == "IMAGE_TOO_LARGE"
    assert (
        admin_client.put(
            "/api/v1/admin/products/9999/image",
            files={"file": ("valid.png", b"anything", "image/png")},
        ).status_code
        == 404
    )


def test_product_image_upload_replaces_previous_file(
    admin_client, database_session, monkeypatch, tmp_path
):
    monkeypatch.setattr(settings, "media_root", str(tmp_path))
    product = create_product(admin_client)
    old_file = tmp_path / "previous.png"
    old_file.write_bytes(b"old")
    database_session.query(Product).filter_by(id=product["id"]).update(
        {"imagem_path": old_file.name}
    )
    database_session.commit()

    image_bytes = io.BytesIO()
    Image.new("RGB", (8, 8), "red").save(image_bytes, format="PNG")
    response = admin_client.put(
        f"/api/v1/admin/products/{product['id']}/image",
        files={"file": ("cupcake.png", image_bytes.getvalue(), "image/png")},
    )
    assert response.status_code == 200, response.text
    assert response.json()["imagem_url"].endswith("/image")
    assert old_file.exists() is False
    image_response = admin_client.get(f"/api/v1/products/{product['id']}/image")
    assert image_response.status_code == 200
    assert image_response.headers["content-type"] == "image/png"


def test_product_admin_routes_require_admin(api_client):
    response = api_client.get("/api/v1/admin/products")
    assert response.status_code == 401
    response = api_client.post(
        "/api/v1/admin/products",
        json={
            "nome": "Cupcake",
            "descricao": "Um cupcake artesanal para testes.",
            "preco": "12.90",
            "quantidade_inicial": 0,
        },
    )
    assert response.status_code == 401
