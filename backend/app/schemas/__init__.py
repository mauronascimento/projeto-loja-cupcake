from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

BRAZIL_STATES = {
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
}


class StrictInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class AddressInput(StrictInput):
    cep: str = Field(pattern=r"^\d{8}$")
    logradouro: str = Field(min_length=1, max_length=150)
    numero: str = Field(min_length=1, max_length=20)
    complemento: str | None = Field(default=None, max_length=100)
    bairro: str = Field(min_length=1, max_length=100)
    cidade: str = Field(min_length=1, max_length=100)
    uf: str = Field(min_length=2, max_length=2)

    @field_validator("uf")
    @classmethod
    def valid_uf(cls, value: str) -> str:
        normalized = value.upper()
        if normalized not in BRAZIL_STATES:
            raise ValueError("Informe uma sigla de estado brasileiro válida.")
        return normalized


class RegisterRequest(StrictInput):
    nome_completo: str = Field(min_length=3, max_length=150)
    telefone: str
    email: EmailStr
    senha: str = Field(min_length=12, max_length=128)
    endereco: AddressInput

    @field_validator("telefone")
    @classmethod
    def valid_phone(cls, value: str) -> str:
        digits = "".join(char for char in value if char.isdigit())
        if len(digits) not in (10, 11):
            raise ValueError("Informe telefone com DDD e 10 ou 11 dígitos.")
        return digits


class LoginRequest(StrictInput):
    email: EmailStr
    senha: str


class UserUpdateRequest(StrictInput):
    nome_completo: str | None = Field(default=None, min_length=3, max_length=150)
    telefone: str | None = None
    endereco: AddressInput | None = None

    @field_validator("telefone")
    @classmethod
    def valid_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        digits = "".join(char for char in value if char.isdigit())
        if len(digits) not in (10, 11):
            raise ValueError("Informe telefone com DDD e 10 ou 11 dígitos.")
        return digits

    @model_validator(mode="after")
    def at_least_one_field(self) -> UserUpdateRequest:
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para atualizar.")
        return self


class PasswordUpdateRequest(StrictInput):
    senha_atual: str
    nova_senha: str = Field(min_length=12, max_length=128)


class UserPublic(BaseModel):
    id: int
    nome_completo: str
    telefone: str
    email: str
    perfil: Literal["CLIENTE", "ADMIN"]
    ativo: bool
    endereco: AddressInput


class ProductCreateRequest(StrictInput):
    nome: str = Field(min_length=2, max_length=150)
    descricao: str = Field(min_length=5, max_length=2000)
    preco: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    quantidade_inicial: int = Field(default=0, ge=0)


class ProductUpdateRequest(StrictInput):
    nome: str | None = Field(default=None, min_length=2, max_length=150)
    descricao: str | None = Field(default=None, min_length=5, max_length=2000)
    preco: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    ativo: bool | None = None

    @model_validator(mode="after")
    def require_update(self) -> ProductUpdateRequest:
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para atualizar.")
        return self


class ProductPublic(BaseModel):
    id: int
    slug: str
    nome: str
    descricao: str
    preco: str
    imagem_url: str
    quantidade_estoque: int
    ativo: bool


class CheckoutItem(StrictInput):
    produto_id: int = Field(gt=0)
    quantidade: int = Field(gt=0, le=999)
    preco_unitario_esperado: Decimal = Field(gt=0, max_digits=10, decimal_places=2)


class CheckoutRequest(StrictInput):
    items: list[CheckoutItem] = Field(min_length=1, max_length=50)
    forma_pagamento: Literal["PIX", "CARTAO", "DINHEIRO"]

    @model_validator(mode="after")
    def unique_products(self) -> CheckoutRequest:
        ids = [item.produto_id for item in self.items]
        if len(ids) != len(set(ids)):
            raise ValueError("Cada produto deve aparecer uma única vez no pedido.")
        return self


class CancelOrderRequest(StrictInput):
    motivo_cancelamento: str | None = Field(default=None, max_length=255)


class OrderStatusUpdateRequest(StrictInput):
    status: Literal["SAIU_PARA_ENTREGA", "ENTREGUE"]


class StockAdjustmentRequest(StrictInput):
    variacao: int
    observacao: str = Field(min_length=3, max_length=255)

    @field_validator("variacao")
    @classmethod
    def non_zero(cls, value: int) -> int:
        if value == 0:
            raise ValueError("A variação de estoque não pode ser zero.")
        return value


class StockMovementPublic(BaseModel):
    id: int
    tipo: str
    variacao: int
    observacao: str | None
    pedido_id: int | None
    usuario_id: int | None
    criado_em: datetime


class OrderItemPublic(BaseModel):
    produto_id: int
    nome_produto: str
    quantidade: int
    preco_unitario: str


class OrderPublic(BaseModel):
    id: int
    usuario_id: int
    nome_cliente: str | None = None
    status: str
    valor_total: str
    forma_pagamento: str
    endereco_entrega: AddressInput
    criado_em: datetime
    entregue_em: datetime | None
    cancelado_em: datetime | None
    cancelado_por: int | None
    motivo_cancelamento: str | None
    items: list[OrderItemPublic]


class PeriodQuery(StrictInput):
    data_inicio: str | None = None
    data_fim: str | None = None


class PeriodRange(BaseModel):
    data_inicio: str
    data_fim: str


class DashboardResponse(BaseModel):
    periodo: PeriodRange
    pedidos_criados: int
    por_status: dict[str, int]
    pedidos_entregues: int
    valor_vendas_concluidas: str
    unidades_vendidas: int
    ticket_medio: str
    estoque: dict[str, int]


class SalesReportResponse(BaseModel):
    group_by: Literal["day", "month"]
    periodo: PeriodRange
    totais: dict[str, int | str]
    series: list[dict[str, int | str]]


class ProductReportResponse(BaseModel):
    periodo: PeriodRange
    items: list[dict[str, int | str]]


class PaymentReportResponse(BaseModel):
    periodo: PeriodRange
    total_registros: int
    valor_total_demonstrativo: str
    items: list[dict[str, int | str]]


def normalize_email(email: str) -> str:
    return email.strip().lower()


def valid_uuid(value: str) -> UUID:
    return UUID(value)
