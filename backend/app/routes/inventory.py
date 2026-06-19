from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from datetime import date, timedelta
from app.db.database import get_db
from app.models.inventory import Inventory
from app.models.meal import ConsumptionLog
from app.schemas.inventory import (
    InventoryCreate, InventoryUpdate, InventoryResponse, ConsumeRequest
)

router = APIRouter()


@router.get("/inventory", response_model=list[InventoryResponse])
def get_inventory(
    location_id: int | None = Query(default=None),
    category_id: int | None = Query(default=None),
    expiring_soon: bool = Query(default=False, description="Apenas a expirar em 7 dias"),
    db: Session = Depends(get_db),
):
    query = db.query(Inventory).options(
        joinedload(Inventory.product),
        joinedload(Inventory.location),
        joinedload(Inventory.unit),
    ).filter(Inventory.quantity > 0)

    if location_id:
        query = query.filter(Inventory.location_id == location_id)
    if category_id:
        query = query.join(Inventory.product).filter(
            Inventory.product.has(category_id=category_id)
        )
    if expiring_soon:
        threshold = date.today() + timedelta(days=7)
        query = query.filter(
            and_(
                Inventory.expiry_date.isnot(None),
                Inventory.expiry_date <= threshold,
            )
        )
    return query.order_by(Inventory.expiry_date.asc().nulls_last()).all()


@router.get("/inventory/stats", response_model=dict)
def get_inventory_stats(db: Session = Depends(get_db)):
    today = date.today()
    total = db.query(Inventory).filter(Inventory.quantity > 0).count()
    expiring = db.query(Inventory).filter(
        Inventory.quantity > 0,
        Inventory.expiry_date.isnot(None),
        Inventory.expiry_date <= today + timedelta(days=7),
        Inventory.expiry_date >= today,
    ).count()
    expired = db.query(Inventory).filter(
        Inventory.quantity > 0,
        Inventory.expiry_date.isnot(None),
        Inventory.expiry_date < today,
    ).count()
    return {
        "total": total,
        "expiring_soon": expiring,
        "expired": expired,
    }


@router.get("/inventory/{id}", response_model=InventoryResponse)
def get_inventory_item(id: int, db: Session = Depends(get_db)):
    item = db.query(Inventory).options(
        joinedload(Inventory.product),
        joinedload(Inventory.location),
        joinedload(Inventory.unit),
    ).filter(Inventory.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return item


@router.post("/inventory", response_model=InventoryResponse, status_code=201)
def create_inventory_item(data: InventoryCreate, db: Session = Depends(get_db)):
    item = Inventory(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/inventory/{id}", response_model=InventoryResponse)
def update_inventory_item(id: int, data: InventoryUpdate, db: Session = Depends(get_db)):
    item = db.query(Inventory).filter(Inventory.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.post("/inventory/{id}/consume", status_code=200)
def consume_inventory_item(id: int, data: ConsumeRequest, db: Session = Depends(get_db)):
    item = db.query(Inventory).filter(Inventory.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    if data.type == "finished":
        quantity_consumed = item.quantity
        item.quantity = 0
    else:
        if data.quantity > item.quantity:
            raise HTTPException(status_code=400, detail="Quantidade insuficiente em stock")
        quantity_consumed = data.quantity
        item.quantity -= data.quantity

    # Registar no consumption log
    log = ConsumptionLog(
        inventory_id=item.id,
        product_id=item.product_id,
        quantity_consumed=quantity_consumed,
        unit_id=item.unit_id,
        consumption_type=data.type,
    )
    db.add(log)
    db.commit()
    return {"id": item.id, "quantity": item.quantity, "consumed": quantity_consumed}


@router.delete("/inventory/{id}", status_code=204)
def delete_inventory_item(id: int, db: Session = Depends(get_db)):
    item = db.query(Inventory).filter(Inventory.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    db.delete(item)
    db.commit()
