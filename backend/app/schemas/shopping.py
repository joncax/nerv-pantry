from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class ShoppingListItemCreate(BaseModel):
    product_id: int
    quantity_needed: float = 1.0
    unit_id: int
    priority: str = "medium"  # high | medium | low
    notes: Optional[str] = None


class ShoppingListItemPatch(BaseModel):
    checked: Optional[bool] = None
    completed: Optional[bool] = None
    quantity_needed: Optional[float] = None
    priority: Optional[str] = None


class ShoppingListItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    quantity_needed: float
    unit_id: int
    priority: str
    added_automatically: bool
    trigger_type: Optional[str] = None
    estimated_price: Optional[float] = None
    checked: bool
    completed: bool
    created_at: datetime


class ShoppingRuleCreate(BaseModel):
    product_id: int
    min_quantity: float
    unit_id: int
    reorder_quantity: float = 1.0


class ShoppingRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    min_quantity: float
    unit_id: int
    reorder_quantity: float
