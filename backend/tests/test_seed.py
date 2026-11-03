from __future__ import annotations

from app.config import settings
from app.models import Product, StockMovement, User
from app.services.seed import PRODUCTS, seed_data


def test_seed_creates_admin_products_and_is_idempotent(
    database_session, monkeypatch, tmp_path
):
    assets = tmp_path / "assets"
    media = tmp_path / "media"
    assets.mkdir()
    (assets / "fallback.svg").write_text("<svg>fallback</svg>")
    (assets / "chocolate-belga.jpg").write_bytes(b"chocolate image")
    (assets / "red-velvet.webp").write_bytes(b"red velvet image")

    monkeypatch.setattr(settings, "admin_email", "  SEED-ADMIN@example.com ")
    monkeypatch.setattr(settings, "admin_password", "senha-de-seed-segura")
    monkeypatch.setattr(settings, "seed_assets", str(assets))
    monkeypatch.setattr(settings, "media_root", str(media))

    seed_data(database_session)
    admin = database_session.query(User).filter_by(email="seed-admin@example.com").one()
    products = database_session.query(Product).order_by(Product.id).all()
    assert len(products) == len(PRODUCTS)
    assert products[0].quantidade_estoque == PRODUCTS[0][4]
    assert products[0].imagem_path == "chocolate-belga.jpg"
    assert products[1].imagem_path == "red-velvet.webp"
    assert products[2].imagem_path == "fallback.svg"
    assert admin.perfil.value == "ADMIN"
    assert (media / "fallback.svg").read_text() == "<svg>fallback</svg>"
    assert (media / "chocolate-belga.jpg").read_bytes() == b"chocolate image"

    original_hash = admin.senha_hash
    products[0].quantidade_estoque = 2
    products[2].imagem_path = "fallback.svg"
    database_session.commit()
    (assets / "baunilha.webp").write_bytes(b"vanilla image")
    (media / "chocolate-belga.jpg").write_bytes(b"customized image")

    seed_data(database_session)
    database_session.expire_all()
    assert (
        database_session.query(User).filter_by(email="seed-admin@example.com").count()
        == 1
    )
    assert database_session.query(Product).count() == len(PRODUCTS)
    assert database_session.query(StockMovement).count() == len(PRODUCTS)
    assert admin.senha_hash == original_hash
    assert products[0].quantidade_estoque == 2
    assert products[0].imagem_path == "chocolate-belga.jpg"
    assert (media / "chocolate-belga.jpg").read_bytes() == b"customized image"
    assert products[2].imagem_path == "baunilha.webp"
    assert (media / "baunilha.webp").read_bytes() == b"vanilla image"
