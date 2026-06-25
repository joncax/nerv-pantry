"""u5-a: is_favorite on products, nullable product_id and name on shopping_list

Revision ID: 3750ff8ee712
Revises: 63b113992af0
Create Date: 2026-06-25 21:49:42.953915

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3750ff8ee712'
down_revision: Union[str, None] = '63b113992af0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nullable corrections (inventory)
    op.alter_column('inventory', 'location_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.alter_column('inventory', 'unit_id',
               existing_type=sa.INTEGER(),
               nullable=True)

    # String length alignments (safe — growing)
    op.alter_column('products', 'name',
               existing_type=sa.VARCHAR(length=200),
               type_=sa.String(length=255),
               existing_nullable=False)
    op.alter_column('products', 'brand',
               existing_type=sa.VARCHAR(length=100),
               type_=sa.String(length=255),
               existing_nullable=True)
    op.alter_column('products', 'consumption_type',
               existing_type=sa.VARCHAR(length=20),
               type_=sa.String(length=50),
               nullable=True)

    # U5-A — alterações intencionais
    op.add_column('products', sa.Column('is_favorite', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('shopping_list', sa.Column('name', sa.String(length=255), nullable=True))
    op.alter_column('shopping_list', 'product_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.alter_column('shopping_list', 'quantity_needed',
               existing_type=sa.DOUBLE_PRECISION(precision=53),
               nullable=True)
    op.alter_column('shopping_list', 'unit_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.alter_column('shopping_list', 'priority',
               existing_type=sa.VARCHAR(length=10),
               type_=sa.String(length=20),
               existing_nullable=False)
    op.alter_column('shopping_list', 'trigger_type',
               existing_type=sa.VARCHAR(length=20),
               type_=sa.String(length=50),
               existing_nullable=True)
    op.alter_column('shopping_rules', 'reorder_quantity',
               existing_type=sa.DOUBLE_PRECISION(precision=53),
               nullable=True)


def downgrade() -> None:
    op.alter_column('shopping_rules', 'reorder_quantity',
               existing_type=sa.DOUBLE_PRECISION(precision=53),
               nullable=False)
    op.alter_column('shopping_list', 'trigger_type',
               existing_type=sa.String(length=50),
               type_=sa.VARCHAR(length=20),
               existing_nullable=True)
    op.alter_column('shopping_list', 'priority',
               existing_type=sa.String(length=20),
               type_=sa.VARCHAR(length=10),
               existing_nullable=False)
    op.alter_column('shopping_list', 'unit_id',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.alter_column('shopping_list', 'quantity_needed',
               existing_type=sa.DOUBLE_PRECISION(precision=53),
               nullable=False)
    op.alter_column('shopping_list', 'product_id',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.drop_column('shopping_list', 'name')
    op.drop_column('products', 'is_favorite')
    op.alter_column('products', 'consumption_type',
               existing_type=sa.String(length=50),
               type_=sa.VARCHAR(length=20),
               nullable=False)
    op.alter_column('products', 'brand',
               existing_type=sa.String(length=255),
               type_=sa.VARCHAR(length=100),
               existing_nullable=True)
    op.alter_column('products', 'name',
               existing_type=sa.String(length=255),
               type_=sa.VARCHAR(length=200),
               existing_nullable=False)
    op.alter_column('inventory', 'unit_id',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.alter_column('inventory', 'location_id',
               existing_type=sa.INTEGER(),
               nullable=False)