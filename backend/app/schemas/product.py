from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.schemas.config import CategoryResponse, LocationResponse, UnitResponse


class ProductCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    default_location_id: Optional[int] = None
    default_unit_id: Optional[int] = None
    default_quantity: Optional[float] = None
    consumption_type: str = "partial"
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
    category_id: Optional[int] = None
    category: Optional[CategoryResponse] = None
    default_location_id: Optional[int] = None
    default_location: Optional[LocationResponse] = None
    default_unit_id: Optional[int] = None
    default_unit: Optional[UnitResponse] = None
    default_quantity: Optional[float] = None
    consumption_type: str
    perishable_days: Optional[int] = None
    alert_days_before: int
    min_stock_quantity: Optional[float] = None
    created_at: datetime
