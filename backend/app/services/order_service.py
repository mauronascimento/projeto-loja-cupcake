from __future__ import annotations

from datetime import datetime, timezone

from fastapi import status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.dependencies import business_error
from app.models import Order, OrderStatus, Product, StockMovementType, User
from app.services.stock_service import apply_stock_variation


def cancel_order(db: Session, order_id: int, actor: User, reason: str | None) -> Order:
    order = db.execute(
        select(Order).where(Order.id == order_id).with_for_update()
    ).scalar_one_or_none()
    if order is None:
        raise business_error(
            status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Pedido não encontrado."
        )
    if actor.perfil.value != "ADMIN" and order.usuario_id != actor.id:
        raise business_error(
            status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Pedido não encontrado."
        )
    if order.status not in (
        OrderStatus.EM_PREPARACAO,
        OrderStatus.SAIU_PARA_ENTREGA,
    ):
        raise business_error(
            status.HTTP_409_CONFLICT,
            "INVALID_STATUS_TRANSITION",
            "Este pedido não pode ser cancelado.",
        )

    product_ids = sorted(item.produto_id for item in order.itens)
    products = (
        db.execute(
            select(Product)
            .where(Product.id.in_(product_ids))
            .order_by(Product.id)
            .with_for_update()
        )
        .scalars()
        .all()
    )
    product_map = {product.id: product for product in products}
    for item in order.itens:
        apply_stock_variation(
            db,
            product_map[item.produto_id],
            item.quantidade,
            StockMovementType.CANCELAMENTO,
            actor,
            reason or "Cancelamento do pedido",
            order,
        )
    order.status = OrderStatus.CANCELADO
    order.cancelado_em = datetime.now(timezone.utc)
    order.cancelado_por = actor.id
    order.motivo_cancelamento = reason
    db.commit()
    return (
        db.execute(
            select(Order)
            .options(
                joinedload(Order.itens),
                joinedload(Order.pagamento),
                joinedload(Order.usuario),
            )
            .where(Order.id == order.id)
        )
        .unique()
        .scalar_one()
    )


def advance_order_status(db: Session, order_id: int, target: OrderStatus) -> Order:
    order = db.execute(
        select(Order).where(Order.id == order_id).with_for_update()
    ).scalar_one_or_none()
    if order is None:
        raise business_error(
            status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Pedido não encontrado."
        )
    allowed = {
        OrderStatus.EM_PREPARACAO: OrderStatus.SAIU_PARA_ENTREGA,
        OrderStatus.SAIU_PARA_ENTREGA: OrderStatus.ENTREGUE,
    }
    if allowed.get(order.status) != target:
        raise business_error(
            status.HTTP_409_CONFLICT,
            "INVALID_STATUS_TRANSITION",
            "A transição solicitada não é permitida.",
        )
    order.status = target
    if target == OrderStatus.ENTREGUE:
        order.entregue_em = datetime.now(timezone.utc)
    db.commit()
    return (
        db.execute(
            select(Order)
            .options(
                joinedload(Order.itens),
                joinedload(Order.pagamento),
                joinedload(Order.usuario),
            )
            .where(Order.id == order.id)
        )
        .unique()
        .scalar_one()
    )
