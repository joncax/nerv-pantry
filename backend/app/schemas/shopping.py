from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, model_validator


# ─── Shopping List ────────────────────────────────────────────────

class ShoppingListItemCreate(BaseModel):
    product_id: Optional[int] = None
    name: Optional[str] = None
    quantity_needed: Optional[float] = None
    unit_id: Optional[int] = None
    priority: str = "medium"
    trigger_type: str = "manual"
    estimated_price: Optional[float] = None

    @model_validator(mode="after")
    def require_product_or_name(self) -> "ShoppingListItemCreate":
        if self.product_id is None and (self.name is None or self.name.strip() == ""):
            raise ValueError("Obrigatório: product_id ou name")
        return self


class ShoppingListItemPatch(BaseModel):
    name: Optional[str] = None
    quantity_needed: Optional[float] = None
    unit_id: Optional[int] = None
    priority: Optional[str] = None
    checked: Optional[bool] = None
    completed: Optional[bool] = None
    estimated_price: Optional[float] = None


class ShoppingListItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: Optional[int] = None
    name: Optional[str] = None
    quantity_needed: Optional[float] = None
    unit_id: Optional[int] = None
    priority: str
    added_automatically: bool
    trigger_type: Optional[str] = None
    estimated_price: Optional[float] = None
    checked: bool
    completed: bool
    completed_at: Optional[datetime] = None
    created_at: datetime


# ─── Shopping Rules ───────────────────────────────────────────────

class ShoppingRuleCreate(BaseModel):
    product_id: int
    min_quantity: float
    unit_id: int
    reorder_quantity: Optional[float] = None


class ShoppingRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    min_quantity: float
    unit_id: int
    reorder_quantity: Optional[float] = None


# ─── Agrupado (U5-B) ─────────────────────────────────────────────

class ShoppingListGrouped(BaseModel):
    auto: list[ShoppingListItemResponse]
    manual: list[ShoppingListItemResponse]


# Alias de compatibilidade
ShoppingListCreate = ShoppingListItemCreate