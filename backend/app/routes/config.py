from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.config import Location, Category, Unit, Store, MealType
from app.schemas.config import (
    LocationCreate, LocationUpdate, LocationResponse,
    CategoryCreate, CategoryResponse,
    UnitCreate, UnitResponse,
    StoreCreate, StoreUpdate, StoreResponse,
    MealTypeCreate, MealTypeResponse,
)

router = APIRouter()


# ─── Locations ───────────────────────────────────────────────────
@router.get("/locations", response_model=list[LocationResponse])
def get_locations(db: Session = Depends(get_db)):
    return db.query(Location).order_by(Location.name).all()

@router.post("/locations", response_model=LocationResponse, status_code=201)
def create_location(data: LocationCreate, db: Session = Depends(get_db)):
    location = Location(**data.model_dump())
    db.add(location)
    db.commit()
    db.refresh(location)
    return location

@router.put("/locations/{id}", response_model=LocationResponse)
def update_location(id: int, data: LocationUpdate, db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.id == id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Localização não encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(location, field, value)
    db.commit()
    db.refresh(location)
    return location

@router.delete("/locations/{id}", status_code=204)
def delete_location(id: int, db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.id == id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Localização não encontrada")
    db.delete(location)
    db.commit()


# ─── Categories ──────────────────────────────────────────────────
@router.get("/categories", response_model=list[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name).all()

@router.post("/categories", response_model=CategoryResponse, status_code=201)
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    category = Category(**data.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.delete("/categories/{id}", status_code=204)
def delete_category(id: int, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    db.delete(category)
    db.commit()


# ─── Units ───────────────────────────────────────────────────────
@router.get("/units", response_model=list[UnitResponse])
def get_units(db: Session = Depends(get_db)):
    return db.query(Unit).order_by(Unit.type, Unit.name).all()

@router.post("/units", response_model=UnitResponse, status_code=201)
def create_unit(data: UnitCreate, db: Session = Depends(get_db)):
    unit = Unit(**data.model_dump())
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


# ─── Stores ──────────────────────────────────────────────────────
@router.get("/stores", response_model=list[StoreResponse])
def get_stores(db: Session = Depends(get_db)):
    return db.query(Store).order_by(Store.name).all()

@router.post("/stores", response_model=StoreResponse, status_code=201)
def create_store(data: StoreCreate, db: Session = Depends(get_db)):
    store = Store(**data.model_dump())
    db.add(store)
    db.commit()
    db.refresh(store)
    return store

@router.put("/stores/{id}", response_model=StoreResponse)
def update_store(id: int, data: StoreUpdate, db: Session = Depends(get_db)):
    store = db.query(Store).filter(Store.id == id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(store, field, value)
    db.commit()
    db.refresh(store)
    return store

@router.delete("/stores/{id}", status_code=204)
def delete_store(id: int, db: Session = Depends(get_db)):
    store = db.query(Store).filter(Store.id == id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    db.delete(store)
    db.commit()


# ─── Meal Types ──────────────────────────────────────────────────
@router.get("/meal-types", response_model=list[MealTypeResponse])
def get_meal_types(db: Session = Depends(get_db)):
    return db.query(MealType).order_by(MealType.order).all()

@router.post("/meal-types", response_model=MealTypeResponse, status_code=201)
def create_meal_type(data: MealTypeCreate, db: Session = Depends(get_db)):
    meal_type = MealType(**data.model_dump())
    db.add(meal_type)
    db.commit()
    db.refresh(meal_type)
    return meal_type