from __future__ import annotations

from decimal import Decimal
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import settings
from app.models import Product, StockMovementType, User, UserRole
from app.services.stock_service import apply_stock_variation
from app.utils.security import hash_password

PRODUCTS = (
    (
        "chocolate-belga",
        "Chocolate Belga",
        "Cupcake de cacau intenso com cobertura cremosa de chocolate belga.",
        "12.90",
        30,
    ),
    (
        "red-velvet",
        "Red Velvet",
        "Massa aveludada com leve toque de cacau e cobertura suave.",
        "14.90",
        25,
    ),
    (
        "baunilha",
        "Baunilha",
        "Massa leve de baunilha com cobertura delicada e sabor clássico.",
        "10.90",
        40,
    ),
    (
        "morango",
        "Morango",
        "Cupcake macio com sabor de morango e cobertura cremosa.",
        "12.90",
        30,
    ),
    (
        "limao-siciliano",
        "Limão Siciliano",
        "Massa aromática com frescor cítrico de limão siciliano.",
        "13.90",
        20,
    ),
    (
        "cenoura-com-chocolate",
        "Cenoura com Chocolate",
        "Massa úmida de cenoura finalizada com cobertura de chocolate.",
        "11.90",
        35,
    ),
    (
        "cookies-and-cream",
        "Cookies & Cream",
        "Creme suave com pedaços crocantes de biscoito de chocolate.",
        "14.90",
        25,
    ),
    (
        "doce-de-leite",
        "Doce de Leite",
        "Cupcake macio com cobertura cremosa de doce de leite.",
        "13.90",
        30,
    ),
)


def seed_data(db: Session) -> None:
    email = str(settings.admin_email).strip().lower()
    admin = db.query(User).filter(User.email == email).first()
    if admin is None:
        db.add(
            User(
                nome_completo="Administrador",
                telefone="11900000000",
                email=email,
                senha_hash=hash_password(settings.admin_password),
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

    fallback = Path(settings.seed_assets) / "fallback.svg"
    asset_root = Path(settings.seed_assets)
    media_root = Path(settings.media_root)
    media_root.mkdir(parents=True, exist_ok=True)
    default_asset = "fallback.svg"
    if fallback.is_file():
        destination = media_root / default_asset
        if not destination.exists():
            destination.write_bytes(fallback.read_bytes())

    for slug, name, description, price, quantity in PRODUCTS:
        product = db.query(Product).filter(Product.slug == slug).first()
        image_file = next(
            (
                candidate
                for candidate in (
                    asset_root / f"{slug}.jpg",
                    asset_root / f"{slug}.webp",
                )
                if candidate.is_file()
            ),
            None,
        )
        image_path = image_file.name if image_file is not None else default_asset
        if image_file is not None:
            target = media_root / image_path
            if not target.exists():
                target.write_bytes(image_file.read_bytes())

        if product is not None:
            if product.imagem_path == default_asset and image_file is not None:
                product.imagem_path = image_path
            continue

        product = Product(
            slug=slug,
            nome=name,
            descricao=description,
            preco=Decimal(price),
            imagem_path=image_path,
            quantidade_estoque=quantity,
            ativo=True,
        )
        db.add(product)
        db.flush()
        apply_stock_variation(
            db,
            product,
            quantity,
            StockMovementType.INICIAL,
            None,
            "Estoque inicial do produto seed",
        )
    db.commit()
