from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime, date
from app.schemas.config import LocationResponse, UnitResponse
from app.schemas.product import ProductResponse


class InventoryCreate(BaseModel):
    product_id: int
    location_id: int
    quantity: float
    unit_id: int
    expiry_date: Optional[date] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None

class InventoryUpdate(BaseModel):
    quantity: Optional[float] = None
    location_id: Optional[int] = None
    expiry_date: Optional[date] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None

class ConsumeRequest(BaseModel):
    quantity: float
    type: str = "used"  # 'used' | 'finished' | 'wasted'

class InventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    product: Optional[ProductResponse] = None
    location_id: int
    location: Optional[LocationResponse] = None
    quantity: float
    unit_id: int
    unit: Optional[UnitResponse] = None
    expiry_date: Optional[date] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime
