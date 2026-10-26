from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Query, status
from sqlalchemy import func

from app.dependencies import AdminUser, DbSession, business_error
from app.models import (
    Order,
    OrderItem,
    OrderStatus,
    Payment,
    PaymentMethod,
    Product,
)
from app.schemas import (
    PaymentReportResponse,
    PeriodRange,
    ProductReportResponse,
)
from app.utils.formatting import SAO_PAULO, money_string, report_period

router = APIRouter(prefix="/admin", tags=["Dashboard e relatórios"])


def inclusive_period(
    data_inicio: str | None,
    data_fim: str | None,
) -> tuple[date, date, datetime, datetime, PeriodRange]:
    start_day, end_day, lower, upper = report_period(data_inicio, data_fim)
    period = PeriodRange(
        data_inicio=start_day.isoformat(), data_fim=end_day.isoformat()
    )
    return start_day, end_day, lower, upper, period


@router.get("/dashboard")
def dashboard(
    db: DbSession,
    admin_user: AdminUser,
    data_inicio: str | None = None,
    data_fim: str | None = None,
):
    start, end, lower, upper, period = inclusive_period(data_inicio, data_fim)
    orders = (
        db.query(Order).filter(Order.criado_em >= lower, Order.criado_em < upper).all()
    )
    by_status = {value.value: 0 for value in OrderStatus}
    for order in orders:
        by_status[order.status.value] += 1
    delivered = [order for order in orders if order.status == OrderStatus.ENTREGUE]
    sales_total = sum((order.valor_total for order in delivered), Decimal("0.00"))
    delivered_ids = [order.id for order in delivered]
    units = (
        db.query(func.coalesce(func.sum(OrderItem.quantidade), 0))
        .filter(OrderItem.pedido_id.in_(delivered_ids))
        .scalar()
        if delivered_ids
        else 0
    )
    active_products = db.query(Product).filter(Product.ativo.is_(True))
    return {
        "periodo": period,
        "pedidos_criados": len(orders),
        "por_status": by_status,
        "pedidos_entregues": len(delivered),
        "valor_vendas_concluidas": money_string(sales_total),
        "unidades_vendidas": int(units or 0),
        "ticket_medio": (
            money_string(sales_total / len(delivered)) if delivered else "0.00"
        ),
        "estoque": {
            "produtos_ativos": active_products.count(),
            "baixo": active_products.filter(
                Product.quantidade_estoque.between(1, 5)
            ).count(),
            "esgotados": active_products.filter(
                Product.quantidade_estoque == 0
            ).count(),
        },
    }


@router.get("/reports/sales")
def sales_report(
    db: DbSession,
    admin_user: AdminUser,
    data_inicio: str | None = None,
    data_fim: str | None = None,
    group_by: str = Query(default="day", pattern="^(day|month)$"),
):
    start, end, lower, upper, period = inclusive_period(data_inicio, data_fim)
    span_days = (end - start).days + 1
    if (group_by == "day" and span_days > 366) or (
        group_by == "month" and span_days > 3660
    ):
        raise business_error(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "VALIDATION_ERROR",
            "O intervalo solicitado é muito extenso.",
        )

    delivered_orders = (
        db.query(Order)
        .filter(
            Order.status == OrderStatus.ENTREGUE,
            Order.criado_em >= lower,
            Order.criado_em < upper,
        )
        .all()
    )
    order_ids = [order.id for order in delivered_orders]
    unit_by_order: dict[int, int] = defaultdict(int)
    if order_ids:
        for order_id, quantity in (
            db.query(OrderItem.pedido_id, func.sum(OrderItem.quantidade))
            .filter(OrderItem.pedido_id.in_(order_ids))
            .group_by(OrderItem.pedido_id)
        ):
            unit_by_order[order_id] = int(quantity or 0)

    def bucket_key(created_at) -> str:
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        local_date = created_at.astimezone(SAO_PAULO).date()
        if group_by == "month":
            return local_date.strftime("%Y-%m")
        return local_date.isoformat()

    buckets: dict[str, dict[str, Decimal | int]] = defaultdict(
        lambda: {"pedidos": 0, "unidades": 0, "valor": Decimal("0.00")}
    )
    total_value = Decimal("0.00")
    total_units = 0
    for order in delivered_orders:
        key = bucket_key(order.criado_em)
        buckets[key]["pedidos"] = int(buckets[key]["pedidos"]) + 1
        buckets[key]["unidades"] = (
            int(buckets[key]["unidades"]) + unit_by_order[order.id]
        )
        buckets[key]["valor"] = Decimal(buckets[key]["valor"]) + order.valor_total
        total_value += order.valor_total
        total_units += unit_by_order[order.id]

    series: list[dict[str, int | str]] = []
    if group_by == "day":
        cursor = start
        while cursor <= end:
            key = cursor.isoformat()
            bucket = buckets[key]
            series.append(
                {
                    "periodo": key,
                    "pedidos": int(bucket["pedidos"]),
                    "unidades": int(bucket["unidades"]),
                    "valor": money_string(Decimal(bucket["valor"])),
                }
            )
            cursor += timedelta(days=1)
    else:
        cursor = date(start.year, start.month, 1)
        last_month = date(end.year, end.month, 1)
        while cursor <= last_month:
            key = cursor.strftime("%Y-%m")
            bucket = buckets[key]
            series.append(
                {
                    "periodo": key,
                    "pedidos": int(bucket["pedidos"]),
                    "unidades": int(bucket["unidades"]),
                    "valor": money_string(Decimal(bucket["valor"])),
                }
            )
            cursor = date(
                cursor.year + (cursor.month == 12),
                1 if cursor.month == 12 else cursor.month + 1,
                1,
            )

    delivered_count = len(delivered_orders)
    return {
        "group_by": group_by,
        "periodo": period,
        "totais": {
            "pedidos": delivered_count,
            "unidades": total_units,
            "valor": money_string(total_value),
            "ticket_medio": (
                money_string(total_value / delivered_count)
                if delivered_count
                else "0.00"
            ),
        },
        "series": series,
    }


@router.get("/reports/products", response_model=ProductReportResponse)
def product_report(
    db: DbSession,
    admin_user: AdminUser,
    data_inicio: str | None = None,
    data_fim: str | None = None,
    limit: int = Query(default=10, ge=1, le=100),
) -> ProductReportResponse:
    _, _, lower, upper, period = inclusive_period(data_inicio, data_fim)
    rows = (
        db.query(
            OrderItem.produto_id,
            func.coalesce(Product.nome, OrderItem.nome_produto).label("nome"),
            func.sum(OrderItem.quantidade).label("quantidade"),
            func.sum(OrderItem.preco_unitario * OrderItem.quantidade).label("valor"),
        )
        .join(Order, Order.id == OrderItem.pedido_id)
        .outerjoin(Product, Product.id == OrderItem.produto_id)
        .filter(
            Order.status == OrderStatus.ENTREGUE,
            Order.criado_em >= lower,
            Order.criado_em < upper,
        )
        .group_by(OrderItem.produto_id, Product.nome, OrderItem.nome_produto)
        .order_by(func.sum(OrderItem.quantidade).desc(), OrderItem.produto_id)
        .limit(limit)
        .all()
    )
    return ProductReportResponse(
        periodo=period,
        items=[
            {
                "produto_id": product_id,
                "nome": name,
                "quantidade": int(quantity),
                "valor": money_string(Decimal(value)),
            }
            for product_id, name, quantity, value in rows
        ],
    )


@router.get("/reports/payments", response_model=PaymentReportResponse)
def payment_report(
    db: DbSession,
    admin_user: AdminUser,
    data_inicio: str | None = None,
    data_fim: str | None = None,
) -> PaymentReportResponse:
    _, _, lower, upper, period = inclusive_period(data_inicio, data_fim)
    rows = (
        db.query(
            Payment.forma_pagamento,
            func.count(Payment.id),
            func.sum(Payment.valor),
        )
        .join(Order, Order.id == Payment.pedido_id)
        .filter(Order.criado_em >= lower, Order.criado_em < upper)
        .group_by(Payment.forma_pagamento)
        .all()
    )
    grouped = {
        method.value: (int(count), Decimal(value or 0)) for method, count, value in rows
    }
    items = [
        {
            "forma_pagamento": method.value,
            "quantidade": grouped.get(method.value, (0, Decimal("0.00")))[0],
            "valor": money_string(grouped.get(method.value, (0, Decimal("0.00")))[1]),
        }
        for method in PaymentMethod
    ]
    return PaymentReportResponse(
        periodo=period,
        total_registros=sum(quantity for quantity, _ in grouped.values()),
        valor_total_demonstrativo=money_string(
            sum((Decimal(item["valor"]) for item in items), Decimal("0.00"))
        ),
        items=items,
    )
