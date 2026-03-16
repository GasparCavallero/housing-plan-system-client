"""Initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-03-16 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "adherentes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("estado", sa.String(length=30), nullable=False),
        sa.Column("cuotas_pagadas", sa.Integer(), nullable=False),
        sa.Column("cuotas_bonificadas_por_licitacion", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_adherentes_id", "adherentes", ["id"])

    op.create_table(
        "plan_configuracion",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cantidad_cuotas", sa.Integer(), nullable=False),
        sa.Column("cantidad_de_adherentes", sa.Integer(), nullable=False),
        sa.Column("metros_cuadrados_vivienda", sa.Float(), nullable=False),
        sa.Column("valor_por_m2", sa.Float(), nullable=False),
        sa.Column("duracion_construccion_meses", sa.Integer(), nullable=False),
        sa.Column("tipo_cambio", sa.Float(), nullable=False),
    )

    op.create_table(
        "plan_estado",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("mes_actual", sa.Integer(), nullable=False),
        sa.Column("fondo_ars", sa.Float(), nullable=False),
        sa.Column("casas_iniciadas", sa.Integer(), nullable=False),
        sa.Column("casas_entregadas", sa.Integer(), nullable=False),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "pagos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("adherente_id", sa.Integer(), nullable=False),
        sa.Column("monto_ars", sa.Float(), nullable=False),
        sa.Column("mes", sa.Integer(), nullable=False),
        sa.Column("fecha", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["adherente_id"], ["adherentes.id"]),
    )
    op.create_index("ix_pagos_id", "pagos", ["id"])
    op.create_index("ix_pagos_adherente_id", "pagos", ["adherente_id"])

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_refresh_tokens_id", "refresh_tokens", ["id"])
    op.create_index(
        "ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])

    op.create_table(
        "viviendas_en_construccion",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("adherente_id", sa.Integer(), nullable=False),
        sa.Column("mes_inicio", sa.Integer(), nullable=False),
        sa.Column("mes_fin", sa.Integer(), nullable=False),
        sa.Column("metodo", sa.String(length=20), nullable=False),
        sa.ForeignKeyConstraint(["adherente_id"], ["adherentes.id"]),
    )
    op.create_index(
        "ix_viviendas_en_construccion_id", "viviendas_en_construccion", ["id"]
    )
    op.create_index(
        "ix_viviendas_en_construccion_adherente_id",
        "viviendas_en_construccion",
        ["adherente_id"],
    )

    plan_config_table = sa.table(
        "plan_configuracion",
        sa.column("id", sa.Integer()),
        sa.column("cantidad_cuotas", sa.Integer()),
        sa.column("cantidad_de_adherentes", sa.Integer()),
        sa.column("metros_cuadrados_vivienda", sa.Float()),
        sa.column("valor_por_m2", sa.Float()),
        sa.column("duracion_construccion_meses", sa.Integer()),
        sa.column("tipo_cambio", sa.Float()),
    )
    plan_estado_table = sa.table(
        "plan_estado",
        sa.column("id", sa.Integer()),
        sa.column("mes_actual", sa.Integer()),
        sa.column("fondo_ars", sa.Float()),
        sa.column("casas_iniciadas", sa.Integer()),
        sa.column("casas_entregadas", sa.Integer()),
    )

    op.bulk_insert(
        plan_config_table,
        [
            {
                "id": 1,
                "cantidad_cuotas": 120,
                "cantidad_de_adherentes": 100,
                "metros_cuadrados_vivienda": 60.0,
                "valor_por_m2": 900000.0,
                "duracion_construccion_meses": 6,
                "tipo_cambio": 1100.0,
            }
        ],
    )
    op.bulk_insert(
        plan_estado_table,
        [
            {
                "id": 1,
                "mes_actual": 0,
                "fondo_ars": 0.0,
                "casas_iniciadas": 0,
                "casas_entregadas": 0,
            }
        ],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_viviendas_en_construccion_adherente_id",
        table_name="viviendas_en_construccion",
    )
    op.drop_index(
        "ix_viviendas_en_construccion_id", table_name="viviendas_en_construccion"
    )
    op.drop_table("viviendas_en_construccion")

    op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_token_hash", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")

    op.drop_index("ix_pagos_adherente_id", table_name="pagos")
    op.drop_index("ix_pagos_id", table_name="pagos")
    op.drop_table("pagos")

    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")

    op.drop_table("plan_estado")
    op.drop_table("plan_configuracion")

    op.drop_index("ix_adherentes_id", table_name="adherentes")
    op.drop_table("adherentes")
