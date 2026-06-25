from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class InventoryCreate(BaseModel):
    product_id: int
    location_id: Optional[int] = None
    quantity: float
    unit_id: Optional[int] = None
    expiry_date: Optional[date] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    receipt_item_id: Optional[int] = None
    notes: Optional[str] = None


class InventoryUpdate(BaseModel):
    location_id: Optional[int] = None
    quantity: Optional[float] = None
    unit_id: Optional[int] = None
    expiry_date: Optional[date] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None


class ConsumeRequest(BaseModel):
    quantity: float
    type: str  # used | finished | wasted


class InventoryStats(BaseModel):
    total: int
    expiring_soon: int
    expired: int


class InventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    location_id: Optional[int] = None
    quantity: float
    unit_id: Optional[int] = None
    expiry_date: Optional[date] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    receipt_item_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    # U5-A: exposto via @property no modelo Inventory
    product_is_favorite: bool = False