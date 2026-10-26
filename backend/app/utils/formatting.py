from __future__ import annotations

import re
import unicodedata
from datetime import date, datetime, time, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

from fastapi import status

from app.dependencies import business_error

SAO_PAULO = ZoneInfo("America/Sao_Paulo")
CENT = Decimal("0.01")


def money_string(value: Decimal) -> str:
    return str(value.quantize(CENT, rounding=ROUND_HALF_UP))


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")
    return slug[:140].rstrip("-")


def report_period(
    data_inicio: str | None, data_fim: str | None
) -> tuple[date, date, datetime, datetime]:
    today = datetime.now(SAO_PAULO).date()
    if data_inicio is None and data_fim is None:
        start = today - timedelta(days=29)
        end = today
    elif data_inicio is None or data_fim is None:
        raise business_error(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "VALIDATION_ERROR",
            "Informe data_inicio e data_fim juntos.",
        )
    else:
        try:
            start = date.fromisoformat(data_inicio)
            end = date.fromisoformat(data_fim)
        except ValueError as exc:
            raise business_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "VALIDATION_ERROR",
                "Datas devem usar o formato AAAA-MM-DD.",
            ) from exc
        if start > end:
            raise business_error(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "VALIDATION_ERROR",
                "data_inicio deve ser anterior ou igual a data_fim.",
            )

    lower = datetime.combine(start, time.min, tzinfo=SAO_PAULO).astimezone(timezone.utc)
    upper = datetime.combine(
        end + timedelta(days=1), time.min, tzinfo=SAO_PAULO
    ).astimezone(timezone.utc)
    return start, end, lower, upper
