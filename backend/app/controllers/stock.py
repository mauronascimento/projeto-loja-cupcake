from __future__ import annotations

from fastapi import APIRouter, Query, status

from app.dependencies import AdminUser, DbSession, business_error
from app.models import Product, StockMovement, StockMovementType
from app.schemas import StockAdjustmentRequest
from app.services.stock_service import apply_stock_variation

router = APIRouter(prefix="/admin/products", tags=["Estoque"])


@router.post("/{product_id}/stock-adjustments")
def adjust_stock(
    product_id: int,
    payload: StockAdjustmentRequest,
    db: DbSession,
    user: AdminUser,
) -> dict[str, int]:
    product = (
        db.query(Product).filter(Product.id == product_id).with_for_update().first()
    )
    if product is None:
        raise business_error(
            status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Produto não encontrado."
        )
    apply_stock_variation(
        db,
        product,
        payload.variacao,
        StockMovementType.AJUSTE,
        user,
        payload.observacao,
    )
    db.commit()
    db.refresh(product)
    return {
        "produto_id": product.id,
        "quantidade_estoque": product.quantidade_estoque,
    }


@router.get("/{product_id}/stock-movements")
def list_stock_movements(
    product_id: int,
    db: DbSession,
    _: AdminUser,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    if not db.query(Product.id).filter(Product.id == product_id).first():
        raise business_error(
            status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Produto não encontrado."
        )
    query = db.query(StockMovement).filter(StockMovement.produto_id == product_id)
    total = query.count()
    rows = (
        query.order_by(StockMovement.criado_em.desc(), StockMovement.id.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return {
        "items": [
            {
                "id": row.id,
                "tipo": row.tipo.value,
                "variacao": row.variacao,
                "observacao": row.observacao,
                "pedido_id": row.pedido_id,
                "usuario_id": row.usuario_id,
                "criado_em": row.criado_em,
            }
            for row in rows
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }
