from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.models.inventory import Inventory
from app.models.meal import ConsumptionLog
from app.schemas.inventory import (
    ConsumeRequest,
    InventoryCreate,
    InventoryResponse,
    InventoryStats,
    InventoryUpdate,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


# ── Stats (rota específica ANTES de /{id}) ─────────────────────────────────────

@router.get("/stats", response_model=InventoryStats)
async def get_stats(db: Session = Depends(get_db)):
    today = date.today()
    warning_date = today + timedelta(days=7)

    total = (
        db.query(func.count(Inventory.id))
        .filter(Inventory.quantity > 0)
        .scalar() or 0
    )

    expiring_soon = (
        db.query(func.count(Inventory.id))
        .filter(
            Inventory.expiry_date.isnot(None),
            Inventory.expiry_date >= today,
            Inventory.expiry_date <= warning_date,
            Inventory.quantity > 0,
        )
        .scalar() or 0
    )

    expired = (
        db.query(func.count(Inventory.id))
        .filter(
            Inventory.expiry_date.isnot(None),
            Inventory.expiry_date < today,
            Inventory.quantity > 0,
        )
        .scalar() or 0
    )

    return InventoryStats(total=total, expiring_soon=expiring_soon, expired=expired)


# ── CRUD ───────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[InventoryResponse])
async def list_inventory(
    location_id: Optional[int] = None,
    expiring_soon: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    # U5-A: joinedload para que product_is_favorite seja acessível via @property
    query = (
        db.query(Inventory)
        .options(joinedload(Inventory.product))
        .filter(Inventory.quantity > 0)
    )

    if location_id:
        query = query.filter(Inventory.location_id == location_id)

    if expiring_soon:
        warning_date = date.today() + timedelta(days=7)
        query = query.filter(
            Inventory.expiry_date.isnot(None),
            Inventory.expiry_date <= warning_date,
        )

    return query.order_by(Inventory.expiry_date.asc().nulls_last()).all()


@router.get("/{item_id}", response_model=InventoryResponse)
async def get_inventory_item(item_id: int, db: Session = Depends(get_db)):
    item = (
        db.query(Inventory)
        .options(joinedload(Inventory.product))
        .filter(Inventory.id == item_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return item


@router.post("", response_model=InventoryResponse, status_code=201)
async def create_inventory_item(data: InventoryCreate, db: Session = Depends(get_db)):
    item = Inventory(**data.model_dump())
    db.add(item)
    db.commit()
    # Recarregar com joinedload para incluir product_is_favorite
    return (
        db.query(Inventory)
        .options(joinedload(Inventory.product))
        .filter(Inventory.id == item.id)
        .first()
    )


@router.put("/{item_id}", response_model=InventoryResponse)
async def update_inventory_item(
    item_id: int, data: InventoryUpdate, db: Session = Depends(get_db)
):
    item = db.get(Inventory, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    return (
        db.query(Inventory)
        .options(joinedload(Inventory.product))
        .filter(Inventory.id == item_id)
        .first()
    )


@router.post("/{item_id}/consume")
async def consume_inventory(
    item_id: int, data: ConsumeRequest, db: Session = Depends(get_db)
):
    item = db.get(Inventory, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    if data.type == "finished":
        consumed_qty = item.quantity
        item.quantity = 0
    else:
        consumed_qty = min(data.quantity, item.quantity)
        item.quantity = max(0.0, item.quantity - data.quantity)

    log = ConsumptionLog(
        inventory_id=item.id,
        product_id=item.product_id,
        quantity_consumed=consumed_qty,
        unit_id=item.unit_id,
        consumption_type=data.type,
    )
    db.add(log)
    db.commit()

    return {"success": True, "remaining_quantity": item.quantity}


@router.delete("/{item_id}", status_code=204)
async def delete_inventory_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(Inventory, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    db.delete(item)
    db.commit()