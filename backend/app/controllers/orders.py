from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Header, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.dependencies import (
    AdminUser,
    ClientUser,
    CurrentUser,
    DbSession,
    business_error,
)
from app.models import Order, OrderStatus, UserRole
from app.schemas import (
    AddressInput,
    CancelOrderRequest,
    CheckoutRequest,
    OrderItemPublic,
    OrderPublic,
    OrderStatusUpdateRequest,
)
from app.services.checkout_service import checkout
from app.services.order_service import advance_order_status, cancel_order

router = APIRouter(tags=["Pedidos"])


def order_public(order: Order, include_customer: bool = False) -> OrderPublic:
    payment_method = order.pagamento.forma_pagamento.value if order.pagamento else "PIX"
    return OrderPublic(
        id=order.id,
        usuario_id=order.usuario_id,
        nome_cliente=(
            order.usuario.nome_completo if include_customer and order.usuario else None
        ),
        status=order.status.value,
        valor_total=str(order.valor_total),
        forma_pagamento=payment_method,
        endereco_entrega=AddressInput(
            cep=order.cep_entrega,
            logradouro=order.logradouro_entrega,
            numero=order.numero_entrega,
            complemento=order.complemento_entrega,
            bairro=order.bairro_entrega,
            cidade=order.cidade_entrega,
            uf=order.uf_entrega,
        ),
        criado_em=order.criado_em,
        entregue_em=order.entregue_em,
        cancelado_em=order.cancelado_em,
        cancelado_por=order.cancelado_por,
        motivo_cancelamento=order.motivo_cancelamento,
        items=[
            OrderItemPublic(
                produto_id=item.produto_id,
                nome_produto=item.nome_produto,
                quantidade=item.quantidade,
                preco_unitario=str(item.preco_unitario),
            )
            for item in order.itens
        ],
    )


def loaded_order_query():
    return select(Order).options(
        joinedload(Order.itens),
        joinedload(Order.pagamento),
        joinedload(Order.usuario),
    )


@router.post("/orders", response_model=OrderPublic)
def create_order(
    payload: CheckoutRequest,
    response: Response,
    db: DbSession,
    user: ClientUser,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> OrderPublic:
    try:
        key = UUID(idempotency_key) if idempotency_key else None
    except ValueError as exc:
        raise business_error(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "VALIDATION_ERROR",
            "Idempotency-Key deve ser um UUID válido.",
        ) from exc
    if key is None:
        raise business_error(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "VALIDATION_ERROR",
            "O cabeçalho Idempotency-Key é obrigatório.",
        )
    order, created = checkout(db, user, payload, key)
    response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    response.headers["Cache-Control"] = "no-store"
    return order_public(order)


@router.get("/orders")
def list_orders(
    db: DbSession,
    user: ClientUser,
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    query = loaded_order_query().where(Order.usuario_id == user.id)
    total = db.query(Order.id).filter(Order.usuario_id == user.id).count()
    orders = (
        db.execute(
            query.order_by(Order.criado_em.desc(), Order.id.desc())
            .limit(limit)
            .offset(offset)
        )
        .unique()
        .scalars()
        .all()
    )
    return {
        "items": [order_public(order) for order in orders],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/orders/{order_id}", response_model=OrderPublic)
def get_order(
    order_id: int, db: DbSession, user: CurrentUser, response: Response
) -> OrderPublic:
    query = loaded_order_query().where(Order.id == order_id)
    if user.perfil != UserRole.ADMIN:
        query = query.where(Order.usuario_id == user.id)
    order = db.execute(query).unique().scalar_one_or_none()
    if order is None:
        raise business_error(
            status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Pedido não encontrado."
        )
    response.headers["Cache-Control"] = "no-store"
    return order_public(order, include_customer=user.perfil == UserRole.ADMIN)


@router.post("/orders/{order_id}/cancel", response_model=OrderPublic)
def cancel(
    order_id: int,
    payload: CancelOrderRequest,
    db: DbSession,
    user: CurrentUser,
    response: Response,
) -> OrderPublic:
    order = cancel_order(db, order_id, user, payload.motivo_cancelamento)
    response.headers["Cache-Control"] = "no-store"
    return order_public(order, include_customer=user.perfil == UserRole.ADMIN)


@router.get("/admin/orders")
def list_admin_orders(
    db: DbSession,
    _: AdminUser,
    status_filter: str | None = Query(default=None, alias="status"),
    data_inicio: str | None = None,
    data_fim: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    query = loaded_order_query()
    if status_filter:
        try:
            query = query.where(Order.status == OrderStatus(status_filter))
        except ValueError as exc:
            raise business_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "VALIDATION_ERROR",
                "Status de pedido inválido.",
            ) from exc
    if bool(data_inicio) != bool(data_fim):
        raise business_error(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "VALIDATION_ERROR",
            "Informe data_inicio e data_fim juntos.",
        )
    if data_inicio and data_fim:
        try:
            start = datetime.fromisoformat(data_inicio).replace(tzinfo=timezone.utc)
            end = datetime.fromisoformat(data_fim).replace(tzinfo=timezone.utc)
        except ValueError as exc:
            raise business_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "VALIDATION_ERROR",
                "Datas inválidas.",
            ) from exc
        if start > end:
            raise business_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "VALIDATION_ERROR",
                "data_inicio deve ser anterior a data_fim.",
            )
        query = query.where(Order.criado_em >= start, Order.criado_em <= end)
    count_query = db.query(Order.id)
    if status_filter:
        count_query = count_query.filter(Order.status == OrderStatus(status_filter))
    if data_inicio and data_fim:
        count_query = count_query.filter(
            Order.criado_em >= start, Order.criado_em <= end
        )
    total = count_query.count()
    rows = (
        db.execute(
            query.order_by(Order.criado_em.desc(), Order.id.desc())
            .limit(limit)
            .offset(offset)
        )
        .unique()
        .scalars()
        .all()
    )
    return {
        "items": [order_public(order, include_customer=True) for order in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/admin/orders/{order_id}", response_model=OrderPublic)
def get_admin_order(order_id: int, db: DbSession, _: AdminUser) -> OrderPublic:
    order = (
        db.execute(loaded_order_query().where(Order.id == order_id))
        .unique()
        .scalar_one_or_none()
    )
    if order is None:
        raise business_error(
            status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Pedido não encontrado."
        )
    return order_public(order, include_customer=True)


@router.patch("/admin/orders/{order_id}/status", response_model=OrderPublic)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdateRequest,
    db: DbSession,
    _: AdminUser,
) -> OrderPublic:
    order = advance_order_status(db, order_id, OrderStatus(payload.status))
    return order_public(order, include_customer=True)
