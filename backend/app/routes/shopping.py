from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.models.config import Store
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.receipt import Receipt, ReceiptItem
from app.models.shopping import ShoppingList, ShoppingRule
from app.schemas.shopping import (
    FavoriteProductResponse,
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
                    .order_by(ReceiptItem.id.desc())
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


# ─── Favoritos (U5-F) ────────────────────────────────────────────

@router.get("/favorites", response_model=list[FavoriteProductResponse])
def get_favorites(db: Session = Depends(get_db)):
    products = (
        db.query(Product)
        .options(joinedload(Product.default_unit))
        .filter(Product.is_favorite == True)
        .order_by(Product.name)
        .all()
    )

    result = []
    for product in products:
        # Stock total em todos os lotes
        total_stock = (
            db.query(func.sum(Inventory.quantity))
            .filter(Inventory.product_id == product.id, Inventory.quantity > 0)
            .scalar() or 0.0
        )

        # Histórico de preços — últimas 10 compras
        price_records = (
            db.query(
                ReceiptItem.effective_price,
                Receipt.purchase_date,
                Store.name.label("store_name"),
            )
            .join(Receipt, ReceiptItem.receipt_id == Receipt.id)
            .outerjoin(Store, Receipt.store_id == Store.id)
            .filter(
                ReceiptItem.product_id == product.id,
                ReceiptItem.effective_price.isnot(None),
                ReceiptItem.is_discount_line == False,
            )
            .order_by(Receipt.purchase_date.desc().nulls_last(), Receipt.id.desc())
            .limit(10)
            .all()
        )

        prices = [float(r.effective_price) for r in price_records if r.effective_price]
        last_price = prices[0] if prices else None
        avg_price = round(sum(prices) / len(prices), 2) if prices else None

        last_purchase_date = None
        last_purchase_store = None
        if price_records:
            if price_records[0].purchase_date:
                last_purchase_date = price_records[0].purchase_date.isoformat()
            last_purchase_store = price_records[0].store_name

        # Frequência de compra (dias entre compras consecutivas)
        purchase_dates = [r.purchase_date for r in price_records if r.purchase_date]
        avg_frequency = None
        if len(purchase_dates) >= 2:
            intervals = [
                (purchase_dates[i] - purchase_dates[i + 1]).days
                for i in range(len(purchase_dates) - 1)
            ]
            avg_frequency = round(sum(intervals) / len(intervals))

        unit_abbr = product.default_unit.abbreviation if product.default_unit else "un"

        result.append(
            FavoriteProductResponse(
                id=product.id,
                name=product.name,
                brand=product.brand,
                min_stock_quantity=product.min_stock_quantity,
                current_stock=float(total_stock),
                unit_abbreviation=unit_abbr,
                last_price=last_price,
                avg_price=avg_price,
                price_history=prices[:8],
                last_purchase_date=last_purchase_date,
                last_purchase_store=last_purchase_store,
                avg_frequency_days=avg_frequency,
            )
        )

    return result