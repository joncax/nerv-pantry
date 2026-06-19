from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime, date, time


class MealItemCreate(BaseModel):
    product_id: int
    quantity: float
    unit_id: int
    wasted: bool = False
    notes: Optional[str] = None


class MealCreate(BaseModel):
    meal_type_id: int
    date: date
    time: Optional[time] = None
    notes: Optional[str] = None
    items: list[MealItemCreate] = []


class MealItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    meal_id: int
    product_id: int
    quantity: float
    unit_id: int
    wasted: bool
    notes: Optional[str] = None


class MealResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    meal_type_id: int
    date: date
    time: Optional[time] = None
    notes: Optional[str] = None
    registered_at: datetime
    created_at: datetime
    items: list[MealItemResponse] = []
