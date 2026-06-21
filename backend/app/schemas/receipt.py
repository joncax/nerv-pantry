from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date, datetime


# --- Schemas existentes (sem alterações) ---

class ParsedItemSchema(BaseModel):
    raw_text: str
    parsed_name: Optional[str] = None
    parsed_quantity: Optional[float] = None
    unit_guess: Optional[str] = None
    original_price: Optional[float] = None
    discount_amount: Optional[float] = None
    effective_price: Optional[float] = None
    is_discount_line: bool = False
    confidence: int = 0


class ReceiptUploadResponse(BaseModel):
    receipt_id: int
    detected_store: Optional[str] = None
    image_path: str
    raw_text: str
    items: list[ParsedItemSchema]
    total_items: int
    status: str


class ReceiptItemConfirm(BaseModel):
    raw_text: str
    parsed_name: Optional[str] = None
    parsed_quantity: Optional[float] = None
    unit_id: Optional[int] = None
    original_price: Optional[float] = None
    discount_amount: Optional[float] = None
    discount_type: Optional[str] = None
    effective_price: Optional[float] = None
    product_id: Optional[int] = None
    is_discount_line: bool = False
    confirmed: bool = True
    add_to_inventory: bool = True
    location_id: Optional[int] = None
    expiry_date: Optional[date] = None


class ReceiptConfirmRequest(BaseModel):
    store_id: Optional[int] = None
    purchase_date: Optional[date] = None
    items: Optional[list[ReceiptItemConfirm]] = None


class ReceiptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    store_id: Optional[int] = None
    purchase_date: Optional[date] = None
    total_amount: Optional[float] = None
    total_savings: Optional[float] = None
    image_path: Optional[str] = None
    status: str
    processed_at: Optional[datetime] = None
    created_at: datetime


# --- Schemas U1-B/G ---

class ReceiptItemResponse(BaseModel):
    """Response para listar items de um talão."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    receipt_id: int
    raw_text: Optional[str] = None
    parsed_name: Optional[str] = None
    parsed_quantity: Optional[float] = None
    parsed_unit_id: Optional[int] = None
    unit_guess: Optional[str] = None
    original_price: Optional[float] = None
    discount_amount: Optional[float] = None
    discount_type: Optional[str] = None
    effective_price: Optional[float] = None
    product_id: Optional[int] = None
    is_discount_line: bool
    confirmed: bool
    add_to_inventory: bool
    is_manual: bool
    # U1-G
    location_id: Optional[int] = None
    expiry_date: Optional[date] = None
    barcode: Optional[str] = None
    created_at: datetime


class ReceiptItemCreate(BaseModel):
    """Criar item manual num talão pending."""
    parsed_name: str
    parsed_quantity: Optional[float] = 1.0
    unit_id: Optional[int] = None
    unit_guess: Optional[str] = None
    original_price: Optional[float] = None
    effective_price: Optional[float] = None
    add_to_inventory: bool = True
    # U1-G
    location_id: Optional[int] = None
    expiry_date: Optional[date] = None
    barcode: Optional[str] = None


class ReceiptItemUpdate(BaseModel):
    """Atualizar campos de um item — auto-save durante revisão (pending) e edição de histórico (confirmed)."""
    parsed_name: Optional[str] = None
    parsed_quantity: Optional[float] = None
    unit_id: Optional[int] = None
    unit_guess: Optional[str] = None
    original_price: Optional[float] = None
    discount_amount: Optional[float] = None
    discount_type: Optional[str] = None
    effective_price: Optional[float] = None
    add_to_inventory: Optional[bool] = None
    confirmed: Optional[bool] = None
    # U1-G
    location_id: Optional[int] = None
    expiry_date: Optional[date] = None
    barcode: Optional[str] = None


class ReceiptUpdate(BaseModel):
    """Atualizar metadados de um talão (loja e data de compra)."""
    store_id: Optional[int] = None
    purchase_date: Optional[date] = None