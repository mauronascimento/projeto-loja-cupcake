from __future__ import annotations

import io
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Query, UploadFile, status
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError
from sqlalchemy import func, or_

from app.config import settings
from app.dependencies import AdminUser, DbSession, business_error
from app.models import Product, StockMovementType
from app.schemas import (
    ProductCreateRequest,
    ProductPublic,
    ProductUpdateRequest,
)
from app.services.stock_service import apply_stock_variation
from app.utils.formatting import money_string, slugify

router = APIRouter(tags=["Produtos"])
IMAGE_LIMIT = 3 * 1024 * 1024
ALLOWED_IMAGE_FORMATS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}


def product_public(product: Product) -> ProductPublic:
    return ProductPublic(
        id=product.id,
        slug=product.slug,
        nome=product.nome,
        descricao=product.descricao,
        preco=money_string(product.preco),
        imagem_url=f"/api/v1/products/{product.id}/image",
        quantidade_estoque=product.quantidade_estoque,
        ativo=product.ativo,
    )


def product_query(
    db: DbSession,
    search: str | None,
    ativo: bool | None,
    public: bool,
    limit: int,
    offset: int,
):
    query = db.query(Product)
    if public:
        query = query.filter(Product.ativo.is_(True))
    elif ativo is not None:
        query = query.filter(Product.ativo.is_(ativo))
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(Product.nome.ilike(term), Product.descricao.ilike(term))
        )
    total = query.with_entities(func.count(Product.id)).scalar() or 0
    rows = query.order_by(Product.nome, Product.id).limit(limit).offset(offset).all()
    return {
        "items": [product_public(product) for product in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/products")
def list_products(
    db: DbSession,
    search: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    return product_query(db, search, None, True, limit, offset)


@router.get("/products/{slug}", response_model=ProductPublic)
def get_product(slug: str, db: DbSession) -> ProductPublic:
    product = (
        db.query(Product).filter(Product.slug == slug, Product.ativo.is_(True)).first()
    )
    if product is None:
        raise business_error(
            status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Produto não encontrado."
        )
    return product_public(product)


@router.get("/products/{product_id}/image")
def get_product_image(product_id: int, db: DbSession):
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise business_error(
            status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Produto não encontrado."
        )
    root = Path(settings.media_root).resolve()
    fallback = (
        Path(__file__).parents[2] / "assets" / "seed-products" / "fallback.svg"
    ).resolve()
    candidate = (root / product.imagem_path).resolve()
    if root not in candidate.parents or not candidate.is_file():
        candidate = fallback
    if not candidate.is_file():
        raise business_error(
            status.HTTP_404_NOT_FOUND,
            "NOT_FOUND",
            "Imagem do produto não encontrada.",
        )
    media_type = {
        ".svg": "image/svg+xml",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }.get(candidate.suffix.lower(), "application/octet-stream")
    return FileResponse(
        candidate,
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/admin/products")
def list_admin_products(
    db: DbSession,
    _: AdminUser,
    search: str | None = Query(default=None, max_length=100),
    ativo: bool | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    return product_query(db, search, ativo, False, limit, offset)


@router.get("/admin/products/{product_id}", response_model=ProductPublic)
def get_admin_product(product_id: int, db: DbSession, _: AdminUser) -> ProductPublic:
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise business_error(
            status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Produto não encontrado."
        )
    return product_public(product)


@router.post(
    "/admin/products",
    status_code=status.HTTP_201_CREATED,
    response_model=ProductPublic,
)
def create_product(
    payload: ProductCreateRequest, db: DbSession, user: AdminUser
) -> ProductPublic:
    slug = slugify(payload.nome)
    if not slug:
        raise business_error(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "VALIDATION_ERROR",
            "O nome não gera um identificador válido.",
        )
    if db.query(Product.id).filter(Product.slug == slug).first():
        raise business_error(
            status.HTTP_409_CONFLICT,
            "SLUG_ALREADY_EXISTS",
            "Já existe um produto com este nome.",
        )
    product = Product(
        slug=slug,
        nome=payload.nome,
        descricao=payload.descricao,
        preco=payload.preco,
        imagem_path="fallback.svg",
        quantidade_estoque=payload.quantidade_inicial,
        ativo=True,
    )
    db.add(product)
    db.flush()
    if payload.quantidade_inicial:
        apply_stock_variation(
            db,
            product,
            payload.quantidade_inicial,
            StockMovementType.INICIAL,
            user,
            "Estoque inicial do produto",
        )
    db.commit()
    db.refresh(product)
    return product_public(product)


@router.patch("/admin/products/{product_id}", response_model=ProductPublic)
def update_product(
    product_id: int, payload: ProductUpdateRequest, db: DbSession, _: AdminUser
) -> ProductPublic:
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise business_error(
            status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Produto não encontrado."
        )
    for field in ("nome", "descricao", "preco", "ativo"):
        value = getattr(payload, field)
        if value is not None:
            setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product_public(product)


@router.put("/admin/products/{product_id}/image", response_model=ProductPublic)
async def upload_product_image(
    product_id: int,
    db: DbSession,
    _: AdminUser,
    file: UploadFile = File(...),
) -> ProductPublic:
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise business_error(
            status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Produto não encontrado."
        )
    content = await file.read(IMAGE_LIMIT + 1)
    if len(content) > IMAGE_LIMIT:
        raise business_error(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            "IMAGE_TOO_LARGE",
            "A imagem deve ter no máximo 3 MiB.",
        )
    try:
        image = Image.open(io.BytesIO(content))
        image.verify()
        image = Image.open(io.BytesIO(content))
        if image.format not in ALLOWED_IMAGE_FORMATS:
            raise ValueError("unsupported format")
        if (
            image.width > 6000
            or image.height > 6000
            or image.width * image.height > 24_000_000
        ):
            raise ValueError("image dimensions exceed limit")
        image.load()
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
    ) as exc:
        raise business_error(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "INVALID_IMAGE",
            "Envie uma imagem JPG, PNG ou WebP válida e com dimensões " "permitidas.",
        ) from exc

    extension = ALLOWED_IMAGE_FORMATS[image.format]
    root = Path(settings.media_root).resolve()
    root.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{extension}"
    target = root / filename
    image.convert("RGB" if image.mode not in ("RGB", "RGBA") else image.mode).save(
        target
    )
    old_path = product.imagem_path
    product.imagem_path = filename
    try:
        db.commit()
    except Exception:
        db.rollback()
        target.unlink(missing_ok=True)
        raise
    old_file = (root / old_path).resolve()
    if root in old_file.parents and old_file != target:
        old_file.unlink(missing_ok=True)
    db.refresh(product)
    return product_public(product)
