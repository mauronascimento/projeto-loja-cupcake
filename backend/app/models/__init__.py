from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
)
from sqlalchemy import Enum as SqlEnum
from sqlalchemy import (
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


PK_ID = BigInteger().with_variant(Integer, "sqlite")


class UserRole(str, Enum):
    CLIENTE = "CLIENTE"
    ADMIN = "ADMIN"


class OrderStatus(str, Enum):
    EM_PREPARACAO = "EM_PREPARACAO"
    SAIU_PARA_ENTREGA = "SAIU_PARA_ENTREGA"
    ENTREGUE = "ENTREGUE"
    CANCELADO = "CANCELADO"


class PaymentMethod(str, Enum):
    PIX = "PIX"
    CARTAO = "CARTAO"
    DINHEIRO = "DINHEIRO"


class StockMovementType(str, Enum):
    INICIAL = "INICIAL"
    VENDA = "VENDA"
    CANCELAMENTO = "CANCELAMENTO"
    AJUSTE = "AJUSTE"


class User(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True)
    nome_completo: Mapped[str] = mapped_column(String(150), nullable=False)
    telefone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    perfil: Mapped[UserRole] = mapped_column(
        SqlEnum(UserRole, native_enum=False, length=10),
        default=UserRole.CLIENTE,
        nullable=False,
    )
    cep: Mapped[str] = mapped_column(String(8), nullable=False)
    logradouro: Mapped[str] = mapped_column(String(150), nullable=False)
    numero: Mapped[str] = mapped_column(String(20), nullable=False)
    complemento: Mapped[str | None] = mapped_column(String(100))
    bairro: Mapped[str] = mapped_column(String(100), nullable=False)
    cidade: Mapped[str] = mapped_column(String(100), nullable=False)
    uf: Mapped[str] = mapped_column(String(2), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    sessoes: Mapped[list[Session]] = relationship(
        back_populates="usuario", cascade="all, delete-orphan"
    )
    pedidos: Mapped[list[Order]] = relationship(
        back_populates="usuario", foreign_keys="Order.usuario_id"
    )

    __table_args__ = (
        CheckConstraint("perfil IN ('CLIENTE','ADMIN')", name="ck_usuarios_perfil"),
        CheckConstraint("length(telefone) IN (10, 11)", name="ck_usuarios_telefone"),
        CheckConstraint("length(cep) = 8", name="ck_usuarios_cep"),
    )


class Session(Base):
    __tablename__ = "sessoes"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revogada_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    usuario: Mapped[User] = relationship(back_populates="sessoes")

    __table_args__ = (Index("ix_sessoes_usuario_expira", "usuario_id", "expira_em"),)


class Product(Base):
    __tablename__ = "produtos"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True)
    slug: Mapped[str] = mapped_column(String(140), unique=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    preco: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    imagem_path: Mapped[str] = mapped_column(Text, nullable=False)
    quantidade_estoque: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    itens_pedido: Mapped[list[OrderItem]] = relationship(back_populates="produto")
    movimentacoes: Mapped[list[StockMovement]] = relationship(back_populates="produto")

    __table_args__ = (
        CheckConstraint("preco > 0", name="ck_produtos_preco_positivo"),
        CheckConstraint(
            "quantidade_estoque >= 0", name="ck_produtos_estoque_nao_negativo"
        ),
        Index("ix_produtos_nome_id", "nome", "id"),
    )


class Order(Base):
    __tablename__ = "pedidos"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[OrderStatus] = mapped_column(
        SqlEnum(OrderStatus, native_enum=False, length=25),
        default=OrderStatus.EM_PREPARACAO,
        nullable=False,
    )
    valor_total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    telefone_entrega: Mapped[str] = mapped_column(String(20), nullable=False)
    cep_entrega: Mapped[str] = mapped_column(String(8), nullable=False)
    logradouro_entrega: Mapped[str] = mapped_column(String(150), nullable=False)
    numero_entrega: Mapped[str] = mapped_column(String(20), nullable=False)
    complemento_entrega: Mapped[str | None] = mapped_column(String(100))
    bairro_entrega: Mapped[str] = mapped_column(String(100), nullable=False)
    cidade_entrega: Mapped[str] = mapped_column(String(100), nullable=False)
    uf_entrega: Mapped[str] = mapped_column(String(2), nullable=False)
    chave_idempotencia: Mapped[UUID] = mapped_column(nullable=False)
    hash_requisicao: Mapped[str] = mapped_column(String(64), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    entregue_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelado_por: Mapped[int | None] = mapped_column(
        ForeignKey("usuarios.id", ondelete="RESTRICT")
    )
    motivo_cancelamento: Mapped[str | None] = mapped_column(String(255))

    usuario: Mapped[User] = relationship(
        back_populates="pedidos", foreign_keys=[usuario_id]
    )
    cancelador: Mapped[User | None] = relationship(foreign_keys=[cancelado_por])
    itens: Mapped[list[OrderItem]] = relationship(
        back_populates="pedido", cascade="all, delete-orphan"
    )
    pagamento: Mapped[Payment | None] = relationship(
        back_populates="pedido", cascade="all, delete-orphan", uselist=False
    )
    movimentacoes: Mapped[list[StockMovement]] = relationship(back_populates="pedido")

    __table_args__ = (
        UniqueConstraint(
            "usuario_id",
            "chave_idempotencia",
            name="uq_pedidos_usuario_idempotencia",
        ),
        CheckConstraint(
            "status IN (" "'EM_PREPARACAO','SAIU_PARA_ENTREGA','ENTREGUE','CANCELADO')",
            name="ck_pedidos_status",
        ),
        CheckConstraint("valor_total > 0", name="ck_pedidos_total_positivo"),
        CheckConstraint(
            "(status = 'ENTREGUE' AND entregue_em IS NOT NULL "
            "AND cancelado_em IS NULL AND cancelado_por IS NULL) "
            "OR (status = 'CANCELADO' AND cancelado_em IS NOT NULL "
            "AND cancelado_por IS NOT NULL AND entregue_em IS NULL) "
            "OR (status IN ('EM_PREPARACAO','SAIU_PARA_ENTREGA') "
            "AND entregue_em IS NULL AND cancelado_em IS NULL "
            "AND cancelado_por IS NULL)",
            name="ck_pedidos_estado_final",
        ),
        Index("ix_pedidos_usuario_criado", "usuario_id", "criado_em"),
        Index("ix_pedidos_status_criado", "status", "criado_em"),
    )


class OrderItem(Base):
    __tablename__ = "itens_pedido"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True)
    pedido_id: Mapped[int] = mapped_column(
        ForeignKey("pedidos.id", ondelete="RESTRICT"), nullable=False
    )
    produto_id: Mapped[int] = mapped_column(
        ForeignKey("produtos.id", ondelete="RESTRICT"), nullable=False
    )
    nome_produto: Mapped[str] = mapped_column(String(150), nullable=False)
    quantidade: Mapped[int] = mapped_column(Integer, nullable=False)
    preco_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    pedido: Mapped[Order] = relationship(back_populates="itens")
    produto: Mapped[Product] = relationship(back_populates="itens_pedido")

    __table_args__ = (
        UniqueConstraint("pedido_id", "produto_id", name="uq_itens_pedido_produto"),
        CheckConstraint("quantidade > 0", name="ck_itens_pedido_quantidade"),
        CheckConstraint("preco_unitario > 0", name="ck_itens_pedido_preco"),
    )


class Payment(Base):
    __tablename__ = "pagamentos"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True)
    pedido_id: Mapped[int] = mapped_column(
        ForeignKey("pedidos.id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
    )
    forma_pagamento: Mapped[PaymentMethod] = mapped_column(
        SqlEnum(PaymentMethod, native_enum=False, length=15), nullable=False
    )
    valor: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    registrado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    pedido: Mapped[Order] = relationship(back_populates="pagamento")

    __table_args__ = (
        CheckConstraint(
            "forma_pagamento IN ('PIX','CARTAO','DINHEIRO')",
            name="ck_pagamentos_forma",
        ),
        CheckConstraint("valor > 0", name="ck_pagamentos_valor"),
    )


class StockMovement(Base):
    __tablename__ = "movimentacoes_estoque"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True)
    produto_id: Mapped[int] = mapped_column(
        ForeignKey("produtos.id", ondelete="RESTRICT"), nullable=False
    )
    pedido_id: Mapped[int | None] = mapped_column(
        ForeignKey("pedidos.id", ondelete="RESTRICT")
    )
    usuario_id: Mapped[int | None] = mapped_column(
        ForeignKey("usuarios.id", ondelete="RESTRICT")
    )
    tipo: Mapped[StockMovementType] = mapped_column(
        SqlEnum(StockMovementType, native_enum=False, length=20),
        nullable=False,
    )
    variacao: Mapped[int] = mapped_column(Integer, nullable=False)
    observacao: Mapped[str | None] = mapped_column(String(255))
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    produto: Mapped[Product] = relationship(back_populates="movimentacoes")
    pedido: Mapped[Order | None] = relationship(back_populates="movimentacoes")
    usuario: Mapped[User | None] = relationship()

    __table_args__ = (
        CheckConstraint(
            "tipo IN ('INICIAL','VENDA','CANCELAMENTO','AJUSTE')",
            name="ck_movimentacoes_tipo",
        ),
        CheckConstraint("variacao != 0", name="ck_movimentacoes_variacao"),
        Index("ix_movimentacoes_produto_criado", "produto_id", "criado_em"),
        Index(
            "uq_movimentacoes_pedido_produto_tipo",
            "pedido_id",
            "produto_id",
            "tipo",
            unique=True,
            postgresql_where=text("pedido_id IS NOT NULL"),
            sqlite_where=text("pedido_id IS NOT NULL"),
        ),
    )


def model_table_names() -> set[str]:
    return set(Base.metadata.tables)
