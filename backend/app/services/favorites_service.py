from __future__ import annotations

from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.inventory import Inventory
from app.models.product import Product
from app.models.shopping import ShoppingList


def check_and_add_to_shopping(product_id: int, db: Session) -> None:
    """
    Chamado após consumo.
    Se o produto é favorito e o stock total ficou abaixo do mínimo,
    adiciona à lista de compras (sem duplicar entradas ativas).
    """
    product = db.get(Product, product_id)
    if not product or not product.is_favorite:
        return

    total_stock = (
        db.query(func.sum(Inventory.quantity))
        .filter(Inventory.product_id == product_id, Inventory.quantity > 0)
        .scalar()
        or 0
    )

    min_qty = product.min_stock_quantity or 0

    # Só adiciona se stock < mínimo (ou esgotado quando min não definido)
    if min_qty > 0 and total_stock >= min_qty:
        return

    # Evitar duplicados — se já existe entrada ativa, não criar outra
    existing = (
        db.query(ShoppingList)
        .filter(
            ShoppingList.product_id == product_id,
            ShoppingList.completed == False,
        )
        .first()
    )
    if existing:
        return

    item = ShoppingList(
        product_id=product_id,
        name=product.name,
        added_automatically=True,
        trigger_type="favorite",
        priority="high" if total_stock == 0 else "medium",
        checked=False,
        completed=False,
    )
    db.add(item)
    db.commit()


def check_and_remove_from_shopping(product_id: int, db: Session) -> None:
    """
    Chamado após confirmação de talão.
    Remove da lista TODOS os itens activos com este product_id,
    independentemente de serem auto-gerados ou adicionados manualmente.
    U6-D: removido filtro added_automatically — o produto foi comprado,
    deve sair da lista seja qual for a origem do item.
    """
    items = (
        db.query(ShoppingList)
        .filter(
            ShoppingList.product_id == product_id,
            ShoppingList.completed == False,
            # U6-D: sem filtro added_automatically
        )
        .all()
    )

    now = datetime.utcnow()
    for item in items:
        item.completed = True
        item.completed_at = now

    if items:
        db.commit()