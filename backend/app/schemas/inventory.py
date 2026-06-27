from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, model_validator


# ─── Schemas aninhados (evitar importação circular) ───────────────

class _Product(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    brand: Optional[str] = None
    category_id: Optional[int] = None
    consumption_type: Optional[str] = None
    min_stock_quantity: Optional[float] = None
    is_favorite: bool = False


class _Location(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None


class _Unit(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    abbreviation: str


class _Store(BaseModel):  # U6-E
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


# ─── Schemas principais ───────────────────────────────────────────

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
    product: Optional[_Product] = None
    location_id: Optional[int] = None
    location: Optional[_Location] = None
    quantity: float
    unit_id: Optional[int] = None
    unit: Optional[_Unit] = None
    expiry_date: Optional[date] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    receipt_item_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    product_is_favorite: bool = False
    store: Optional[_Store] = None  # U6-E

    @model_validator(mode='before')
    @classmethod
    def _extract_store(cls, data: Any) -> Any:
        """
        U6-E: extrai loja da cadeia receipt_item → receipt → store.
        Só processa objectos ORM — dicts passam directo.
        """
        if isinstance(data, dict) or not hasattr(data, 'receipt_item'):
            return data

        store = None
        ri = getattr(data, 'receipt_item', None)
        if ri is not None:
            receipt = getattr(ri, 'receipt', None)
            if receipt is not None:
                store = getattr(receipt, 'store', None)

        # Converter ORM para dict com store injectada.
        # Os campos aninhados (product, location, unit) são objectos ORM —
        # os respectivos schemas têm from_attributes=True e processam-nos correctamente.
        return {
            'id': data.id,
            'product_id': data.product_id,
            'product': data.product,
            'location_id': data.location_id,
            'location': data.location,
            'quantity': data.quantity,
            'unit_id': data.unit_id,
            'unit': data.unit,
            'expiry_date': data.expiry_date,
            'purchase_date': data.purchase_date,
            'purchase_price': data.purchase_price,
            'receipt_item_id': data.receipt_item_id,
            'notes': data.notes,
            'created_at': data.created_at,
            'product_is_favorite': data.product_is_favorite,
            'store': store,
        }