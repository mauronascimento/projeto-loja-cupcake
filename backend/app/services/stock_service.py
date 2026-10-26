from __future__ import annotations

from fastapi import status
from sqlalchemy.orm import Session

from app.dependencies import business_error
from app.models import Order, Product, StockMovement, StockMovementType, User


def apply_stock_variation(
    db: Session,
    product: Product,
    variation: int,
    movement_type: StockMovementType,
    user: User | None,
    reason: str,
    order: Order | None = None,
) -> None:
    new_stock = product.quantidade_estoque + variation
    if new_stock < 0:
        raise business_error(
            status.HTTP_409_CONFLICT,
            "STOCK_CONFLICT",
            "O estoque não pode ficar negativo.",
            {
                "produto_id": product.id,
                "quantidade_disponivel": product.quantidade_estoque,
            },
        )
    product.quantidade_estoque = new_stock
    db.add(
        StockMovement(
            produto_id=product.id,
            pedido_id=order.id if order else None,
            usuario_id=user.id if user else None,
            tipo=movement_type,
            variacao=variation,
            observacao=reason,
        )
    )
