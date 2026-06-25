from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.inventory import Inventory
from app.models.receipt import ReceiptItem
from app.models.shopping import ShoppingList, ShoppingRule
from app.schemas.shopping import (
    ShoppingListGrouped,
    ShoppingListItemCreate,
    ShoppingListItemPatch,
    ShoppingListItemResponse,
    ShoppingRuleCreate,
    ShoppingRuleResponse,
)

router = APIRouter()


# ─── Lista de compras ─────────────────────────────────────────────

@router.get("/shopping", response_model=ShoppingListGrouped)
def get_shopping_list(db: Session = Depends(get_db)):
    items = (
        db.query(ShoppingList)
        .filter(ShoppingList.completed == False)
        .order_by(ShoppingList.priority.desc(), ShoppingList.created_at.desc())
        .all()
    )
    return ShoppingListGrouped(
        auto=[i for i in items if i.added_automatically],
        manual=[i for i in items if not i.added_automatically],
    )


@router.post("/shopping", response_model=ShoppingListItemResponse, status_code=201)
def add_to_shopping_list(data: ShoppingListItemCreate, db: Session = Depends(get_db)):
    item = ShoppingList(
        **data.model_dump(),
        added_automatically=False,
        checked=False,
        completed=False,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/shopping/{id}", response_model=ShoppingListItemResponse)
def update_shopping_item(
    id: int, data: ShoppingListItemPatch, db: Session = Depends(get_db)
):
    item = db.query(ShoppingList).filter(ShoppingList.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    if data.completed:
        item.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return item


@router.delete("/shopping/{id}", status_code=204)
def delete_shopping_item(id: int, db: Session = Depends(get_db)):
    item = db.query(ShoppingList).filter(ShoppingList.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    db.delete(item)
    db.commit()


@router.delete("/shopping/completed/clear", status_code=204)
def clear_completed(db: Session = Depends(get_db)):
    db.query(ShoppingList).filter(ShoppingList.completed == True).delete()
    db.commit()


# ─── Geração automática ──────────────────────────────────────────

@router.post("/shopping/generate")
def generate_shopping_list(db: Session = Depends(get_db)):
    rules = db.query(ShoppingRule).all()
    added = 0

    for rule in rules:
        total_stock = sum(
            inv.quantity
            for inv in db.query(Inventory)
            .filter(Inventory.product_id == rule.product_id, Inventory.quantity > 0)
            .all()
        )

        if total_stock <= rule.min_quantity:
            existing = (
                db.query(ShoppingList)
                .filter(
                    ShoppingList.product_id == rule.product_id,
                    ShoppingList.completed == False,
                )
                .first()
            )
            if not existing:
                last_price = (
                    db.query(ReceiptItem.effective_price)
                    .filter(
                        ReceiptItem.product_id == rule.product_id,
                        ReceiptItem.effective_price.isnot(None),
                    )
                    .order_by(ReceiptItem.created_at.desc())
                    .first()
                )
                item = ShoppingList(
                    product_id=rule.product_id,
                    quantity_needed=rule.reorder_quantity,
                    unit_id=rule.unit_id,
                    priority="high" if total_stock == 0 else "medium",
                    added_automatically=True,
                    trigger_type="min_stock",
                    estimated_price=last_price[0] if last_price else None,
                    checked=False,
                    completed=False,
                )
                db.add(item)
                added += 1

    db.commit()
    return {"message": f"{added} itens adicionados à lista", "added": added}


# ─── Regras de stock mínimo ──────────────────────────────────────

@router.get("/shopping/rules", response_model=list[ShoppingRuleResponse])
def get_shopping_rules(db: Session = Depends(get_db)):
    return db.query(ShoppingRule).all()


@router.post("/shopping/rules", response_model=ShoppingRuleResponse, status_code=201)
def create_shopping_rule(data: ShoppingRuleCreate, db: Session = Depends(get_db)):
    rule = ShoppingRule(**data.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/shopping/rules/{id}", status_code=204)
def delete_shopping_rule(id: int, db: Session = Depends(get_db)):
    rule = db.query(ShoppingRule).filter(ShoppingRule.id == id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")
    db.delete(rule)
    db.commit()