from __future__ import annotations

import hashlib
import json
from decimal import Decimal
from uuid import UUID

from fastapi import status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.dependencies import business_error
from app.models import (
    Order,
    OrderItem,
    OrderStatus,
    Payment,
    PaymentMethod,
    Product,
    StockMovementType,
    User,
)
from app.schemas import CheckoutRequest
from app.services.stock_service import apply_stock_variation


def request_fingerprint(payload: CheckoutRequest) -> str:
    canonical = {
        "forma_pagamento": payload.forma_pagamento,
        "items": [
            {
                "produto_id": item.produto_id,
                "quantidade": item.quantidade,
                "preco_unitario_esperado": format(item.preco_unitario_esperado, ".2f"),
            }
            for item in sorted(payload.items, key=lambda entry: entry.produto_id)
        ],
    }
    return hashlib.sha256(json.dumps(canonical, sort_keys=True).encode()).hexdigest()


def checkout(
    db: Session,
    user: User,
    payload: CheckoutRequest,
    idempotency_key: UUID,
) -> tuple[Order, bool]:
    fingerprint = request_fingerprint(payload)
    previous = (
        db.execute(
            select(Order)
            .options(
                joinedload(Order.itens),
                joinedload(Order.pagamento),
                joinedload(Order.usuario),
            )
            .where(
                Order.usuario_id == user.id,
                Order.chave_idempotencia == idempotency_key,
            )
        )
        .unique()
        .scalar_one_or_none()
    )
    if previous:
        if previous.hash_requisicao != fingerprint:
            raise business_error(
                status.HTTP_409_CONFLICT,
                "IDEMPOTENCY_CONFLICT",
                "A chave de idempotência já foi usada com outro pedido.",
            )
        return previous, False

    product_ids = sorted(item.produto_id for item in payload.items)
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
    if len(product_map) != len(product_ids):
        raise business_error(
            status.HTTP_409_CONFLICT,
            "PRODUCT_UNAVAILABLE",
            "Um ou mais produtos não estão disponíveis.",
        )

    total = Decimal("0.00")
    for item in payload.items:
        product = product_map[item.produto_id]
        if not product.ativo:
            raise business_error(
                status.HTTP_409_CONFLICT,
                "PRODUCT_UNAVAILABLE",
                "Um ou mais produtos não estão disponíveis.",
            )
        if product.preco != item.preco_unitario_esperado:
            raise business_error(
                status.HTTP_409_CONFLICT,
                "PRICE_CHANGED",
                "O preço de um produto mudou. Revise o carrinho antes " "de continuar.",
                {
                    "produto_id": product.id,
                    "preco_esperado": str(item.preco_unitario_esperado),
                    "preco_atual": str(product.preco),
                },
            )
        if product.quantidade_estoque < item.quantidade:
            raise business_error(
                status.HTTP_409_CONFLICT,
                "INSUFFICIENT_STOCK",
                "Estoque insuficiente para um ou mais produtos.",
                {
                    "produto_id": product.id,
                    "quantidade_disponivel": product.quantidade_estoque,
                },
            )
        total += product.preco * item.quantidade

    order = Order(
        usuario_id=user.id,
        status=OrderStatus.EM_PREPARACAO,
        valor_total=total,
        telefone_entrega=user.telefone,
        cep_entrega=user.cep,
        logradouro_entrega=user.logradouro,
        numero_entrega=user.numero,
        complemento_entrega=user.complemento,
        bairro_entrega=user.bairro,
        cidade_entrega=user.cidade,
        uf_entrega=user.uf,
        chave_idempotencia=idempotency_key,
        hash_requisicao=fingerprint,
    )
    db.add(order)
    try:
        db.flush()
        for line in payload.items:
            product = product_map[line.produto_id]
            db.add(
                OrderItem(
                    pedido_id=order.id,
                    produto_id=product.id,
                    nome_produto=product.nome,
                    quantidade=line.quantidade,
                    preco_unitario=product.preco,
                )
            )
            apply_stock_variation(
                db,
                product,
                -line.quantidade,
                StockMovementType.VENDA,
                user,
                "Venda no checkout",
                order,
            )
        db.add(
            Payment(
                pedido_id=order.id,
                forma_pagamento=PaymentMethod(payload.forma_pagamento),
                valor=total,
            )
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        previous = (
            db.execute(
                select(Order)
                .options(
                    joinedload(Order.itens),
                    joinedload(Order.pagamento),
                    joinedload(Order.usuario),
                )
                .where(
                    Order.usuario_id == user.id,
                    Order.chave_idempotencia == idempotency_key,
                )
            )
            .unique()
            .scalar_one_or_none()
        )
        if previous and previous.hash_requisicao == fingerprint:
            return previous, False
        if previous:
            raise business_error(
                status.HTTP_409_CONFLICT,
                "IDEMPOTENCY_CONFLICT",
                "A chave de idempotência já foi usada com outro pedido.",
            )
        raise

    order = (
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
    return order, True
