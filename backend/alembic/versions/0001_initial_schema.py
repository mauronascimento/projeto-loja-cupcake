"""Create the seven Cupcake Store domain tables."""

import sqlalchemy as sa

from alembic import op

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    primary_key = sa.BigInteger().with_variant(sa.Integer(), "sqlite")

    op.create_table(
        "usuarios",
        sa.Column("id", primary_key, primary_key=True),
        sa.Column("nome_completo", sa.String(150), nullable=False),
        sa.Column("telefone", sa.String(20), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("senha_hash", sa.String(255), nullable=False),
        sa.Column("perfil", sa.String(10), nullable=False),
        sa.Column("cep", sa.String(8), nullable=False),
        sa.Column("logradouro", sa.String(150), nullable=False),
        sa.Column("numero", sa.String(20), nullable=False),
        sa.Column("complemento", sa.String(100)),
        sa.Column("bairro", sa.String(100), nullable=False),
        sa.Column("cidade", sa.String(100), nullable=False),
        sa.Column("uf", sa.String(2), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "atualizado_em",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint("perfil IN ('CLIENTE','ADMIN')", name="ck_usuarios_perfil"),
        sa.CheckConstraint("length(telefone) IN (10, 11)", name="ck_usuarios_telefone"),
        sa.CheckConstraint("length(cep) = 8", name="ck_usuarios_cep"),
    )
    op.create_index("ix_usuarios_email", "usuarios", ["email"], unique=True)

    op.create_table(
        "sessoes",
        sa.Column("id", primary_key, primary_key=True),
        sa.Column(
            "usuario_id",
            primary_key,
            sa.ForeignKey("usuarios.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expira_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revogada_em", sa.DateTime(timezone=True)),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_sessoes_usuario_expira", "sessoes", ["usuario_id", "expira_em"])

    op.create_table(
        "produtos",
        sa.Column("id", primary_key, primary_key=True),
        sa.Column("slug", sa.String(140), nullable=False, unique=True),
        sa.Column("nome", sa.String(150), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=False),
        sa.Column("preco", sa.Numeric(10, 2), nullable=False),
        sa.Column("imagem_path", sa.Text(), nullable=False),
        sa.Column("quantidade_estoque", sa.Integer(), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "atualizado_em",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint("preco > 0", name="ck_produtos_preco_positivo"),
        sa.CheckConstraint(
            "quantidade_estoque >= 0",
            name="ck_produtos_estoque_nao_negativo",
        ),
    )
    op.create_index("ix_produtos_nome_id", "produtos", ["nome", "id"])

    op.create_table(
        "pedidos",
        sa.Column("id", primary_key, primary_key=True),
        sa.Column(
            "usuario_id",
            primary_key,
            sa.ForeignKey("usuarios.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("status", sa.String(25), nullable=False),
        sa.Column("valor_total", sa.Numeric(10, 2), nullable=False),
        sa.Column("telefone_entrega", sa.String(20), nullable=False),
        sa.Column("cep_entrega", sa.String(8), nullable=False),
        sa.Column("logradouro_entrega", sa.String(150), nullable=False),
        sa.Column("numero_entrega", sa.String(20), nullable=False),
        sa.Column("complemento_entrega", sa.String(100)),
        sa.Column("bairro_entrega", sa.String(100), nullable=False),
        sa.Column("cidade_entrega", sa.String(100), nullable=False),
        sa.Column("uf_entrega", sa.String(2), nullable=False),
        sa.Column("chave_idempotencia", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("hash_requisicao", sa.String(64), nullable=False),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "atualizado_em",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("entregue_em", sa.DateTime(timezone=True)),
        sa.Column("cancelado_em", sa.DateTime(timezone=True)),
        sa.Column(
            "cancelado_por",
            primary_key,
            sa.ForeignKey("usuarios.id", ondelete="RESTRICT"),
        ),
        sa.Column("motivo_cancelamento", sa.String(255)),
        sa.UniqueConstraint(
            "usuario_id",
            "chave_idempotencia",
            name="uq_pedidos_usuario_idempotencia",
        ),
        sa.CheckConstraint(
            "status IN (" "'EM_PREPARACAO','SAIU_PARA_ENTREGA','ENTREGUE','CANCELADO')",
            name="ck_pedidos_status",
        ),
        sa.CheckConstraint("valor_total > 0", name="ck_pedidos_total_positivo"),
        sa.CheckConstraint(
            "(status = 'ENTREGUE' AND entregue_em IS NOT NULL "
            "AND cancelado_em IS NULL AND cancelado_por IS NULL) "
            "OR (status = 'CANCELADO' AND cancelado_em IS NOT NULL "
            "AND cancelado_por IS NOT NULL AND entregue_em IS NULL) "
            "OR (status IN ('EM_PREPARACAO','SAIU_PARA_ENTREGA') "
            "AND entregue_em IS NULL AND cancelado_em IS NULL "
            "AND cancelado_por IS NULL)",
            name="ck_pedidos_estado_final",
        ),
    )
    op.create_index("ix_pedidos_usuario_criado", "pedidos", ["usuario_id", "criado_em"])
    op.create_index("ix_pedidos_status_criado", "pedidos", ["status", "criado_em"])

    op.create_table(
        "itens_pedido",
        sa.Column("id", primary_key, primary_key=True),
        sa.Column(
            "pedido_id",
            primary_key,
            sa.ForeignKey("pedidos.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "produto_id",
            primary_key,
            sa.ForeignKey("produtos.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("nome_produto", sa.String(150), nullable=False),
        sa.Column("quantidade", sa.Integer(), nullable=False),
        sa.Column("preco_unitario", sa.Numeric(10, 2), nullable=False),
        sa.UniqueConstraint("pedido_id", "produto_id", name="uq_itens_pedido_produto"),
        sa.CheckConstraint("quantidade > 0", name="ck_itens_pedido_quantidade"),
        sa.CheckConstraint("preco_unitario > 0", name="ck_itens_pedido_preco"),
    )

    op.create_table(
        "pagamentos",
        sa.Column("id", primary_key, primary_key=True),
        sa.Column(
            "pedido_id",
            primary_key,
            sa.ForeignKey("pedidos.id", ondelete="RESTRICT"),
            nullable=False,
            unique=True,
        ),
        sa.Column("forma_pagamento", sa.String(15), nullable=False),
        sa.Column("valor", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "registrado_em",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "forma_pagamento IN ('PIX','CARTAO','DINHEIRO')",
            name="ck_pagamentos_forma",
        ),
        sa.CheckConstraint("valor > 0", name="ck_pagamentos_valor"),
    )

    op.create_table(
        "movimentacoes_estoque",
        sa.Column("id", primary_key, primary_key=True),
        sa.Column(
            "produto_id",
            primary_key,
            sa.ForeignKey("produtos.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "pedido_id",
            primary_key,
            sa.ForeignKey("pedidos.id", ondelete="RESTRICT"),
        ),
        sa.Column(
            "usuario_id",
            primary_key,
            sa.ForeignKey("usuarios.id", ondelete="RESTRICT"),
        ),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("variacao", sa.Integer(), nullable=False),
        sa.Column("observacao", sa.String(255)),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "tipo IN ('INICIAL','VENDA','CANCELAMENTO','AJUSTE')",
            name="ck_movimentacoes_tipo",
        ),
        sa.CheckConstraint("variacao != 0", name="ck_movimentacoes_variacao"),
    )
    op.create_index(
        "ix_movimentacoes_produto_criado",
        "movimentacoes_estoque",
        ["produto_id", "criado_em"],
    )
    op.create_index(
        "uq_movimentacoes_pedido_produto_tipo",
        "movimentacoes_estoque",
        ["pedido_id", "produto_id", "tipo"],
        unique=True,
        postgresql_where=sa.text("pedido_id IS NOT NULL"),
        sqlite_where=sa.text("pedido_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_movimentacoes_pedido_produto_tipo",
        table_name="movimentacoes_estoque",
    )
    op.drop_index(
        "ix_movimentacoes_produto_criado",
        table_name="movimentacoes_estoque",
    )
    op.drop_table("movimentacoes_estoque")
    op.drop_table("pagamentos")
    op.drop_table("itens_pedido")
    op.drop_index("ix_pedidos_status_criado", table_name="pedidos")
    op.drop_index("ix_pedidos_usuario_criado", table_name="pedidos")
    op.drop_table("pedidos")
    op.drop_index("ix_produtos_nome_id", table_name="produtos")
    op.drop_table("produtos")
    op.drop_index("ix_sessoes_usuario_expira", table_name="sessoes")
    op.drop_table("sessoes")
    op.drop_index("ix_usuarios_email", table_name="usuarios")
    op.drop_table("usuarios")
