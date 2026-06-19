from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from datetime import date, datetime
from app.db.database import get_db
from app.models.meal import Meal, MealItem, ConsumptionLog
from app.models.inventory import Inventory
from app.schemas.meal import MealCreate, MealResponse

router = APIRouter()


@router.get("/meals", response_model=list[MealResponse])
def get_meals(
    meal_date: date | None = Query(default=None, description="Filtrar por data"),
    db: Session = Depends(get_db),
):
    query = db.query(Meal).options(joinedload(Meal.items))
    if meal_date:
        query = query.filter(Meal.date == meal_date)
    return query.order_by(Meal.date.desc(), Meal.time.asc()).all()


@router.get("/meals/today", response_model=list[MealResponse])
def get_today_meals(db: Session = Depends(get_db)):
    today = date.today()
    return (
        db.query(Meal)
        .options(joinedload(Meal.items))
        .filter(Meal.date == today)
        .order_by(Meal.time.asc())
        .all()
    )


@router.post("/meals", response_model=MealResponse, status_code=201)
def create_meal(data: MealCreate, db: Session = Depends(get_db)):
    meal = Meal(
        meal_type_id=data.meal_type_id,
        date=data.date,
        time=data.time,
        notes=data.notes,
        registered_at=datetime.utcnow(),
    )
    db.add(meal)
    db.flush()

    for item_data in data.items:
        meal_item = MealItem(
            meal_id=meal.id,
            product_id=item_data.product_id,
            quantity=item_data.quantity,
            unit_id=item_data.unit_id,
            wasted=item_data.wasted,
            notes=item_data.notes,
        )
        db.add(meal_item)
        db.flush()

        # Atualizar inventário
        inv = (
            db.query(Inventory)
            .filter(
                Inventory.product_id == item_data.product_id,
                Inventory.quantity > 0,
            )
            .order_by(Inventory.expiry_date.asc().nulls_last())
            .first()
        )

        consumption_type = "wasted" if item_data.wasted else "used"
        consumed_qty = item_data.quantity

        if inv:
            if consumed_qty >= inv.quantity:
                consumed_qty = inv.quantity
                inv.quantity = 0
                consumption_type = "finished"
            else:
                inv.quantity -= consumed_qty

        log = ConsumptionLog(
            inventory_id=inv.id if inv else None,
            product_id=item_data.product_id,
            quantity_consumed=consumed_qty,
            unit_id=item_data.unit_id,
            consumption_type=consumption_type,
            meal_item_id=meal_item.id,
        )
        db.add(log)

    db.commit()
    db.refresh(meal)
    return meal


@router.delete("/meals/{meal_id}", status_code=204)
def delete_meal(meal_id: int, db: Session = Depends(get_db)):
    meal = db.query(Meal).filter(Meal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Refeição não encontrada")
    db.delete(meal)
    db.commit()
