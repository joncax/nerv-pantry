from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ProductCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    barcode: Optional[str] = None
    open_food_facts_id: Optional[str] = None
    category_id: Optional[int] = None
    default_location_id: Optional[int] = None
    default_unit_id: Optional[int] = None
    default_quantity: Optional[float] = None
    consumption_type: Optional[str] = None
    perishable_days: Optional[int] = None
    alert_days_before: int = 2
    min_stock_quantity: Optional[float] = None
    min_stock_unit_id: Optional[int] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    default_location_id: Optional[int] = None
    default_unit_id: Optional[int] = None
    default_quantity: Optional[float] = None
    consumption_type: Optional[str] = None
    perishable_days: Optional[int] = None
    alert_days_before: Optional[int] = None
    min_stock_quantity: Optional[float] = None
    min_stock_unit_id: Optional[int] = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    brand: Optional[str] = None
    barcode: Optional[str] = None
    open_food_facts_id: Optional[str] = None
    category_id: Optional[int] = None
    default_location_id: Optional[int] = None
    default_unit_id: Optional[int] = None
    default_quantity: Optional[float] = None
    consumption_type: Optional[str] = None
    perishable_days: Optional[int] = None
    alert_days_before: int = 2
    min_stock_quantity: Optional[float] = None
    min_stock_unit_id: Optional[int] = None
    # U5-A
    is_favorite: bool = False
    created_at: datetime