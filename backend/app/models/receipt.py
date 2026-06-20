from sqlalchemy import Integer, String, Float, ForeignKey, DateTime, Date, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime, date
from app.db.database import Base


class Receipt(Base):
    __tablename__ = "receipts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    store_id: Mapped[Optional[int]] = mapped_column(ForeignKey("stores.id"), nullable=True)
    purchase_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    total_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_savings: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    image_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    raw_ocr_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    # status: 'pending' | 'confirmed' | 'error'
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    store: Mapped[Optional["Store"]] = relationship("Store", back_populates="receipts")
    items: Mapped[list["ReceiptItem"]] = relationship(back_populates="receipt", cascade="all, delete-orphan")


class ReceiptItem(Base):
    __tablename__ = "receipt_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    receipt_id: Mapped[int] = mapped_column(ForeignKey("receipts.id"), nullable=False)
    raw_text: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    parsed_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    parsed_quantity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    parsed_unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("units.id"), nullable=True)

    # Pricing with discount support
    original_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    discount_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    discount_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # discount_type: 'cartao' | 'promocao' | 'pack' | 'outro'
    effective_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Parser hint — unidade detetada pelo OCR, guardada para uso no confirm
    unit_guess: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # Item adicionado manualmente pelo utilizador (não veio do OCR)
    is_manual: Mapped[bool] = mapped_column(Boolean, default=False, server_default='false')

    product_id: Mapped[Optional[int]] = mapped_column(ForeignKey("products.id"), nullable=True)
    is_discount_line: Mapped[bool] = mapped_column(Boolean, default=False)
    barcode_lookup_attempted: Mapped[bool] = mapped_column(Boolean, default=False)
    barcode_lookup_source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # source: 'open_food_facts' | 'manual' | 'scan'
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    add_to_inventory: Mapped[bool] = mapped_column(Boolean, default=True, server_default='true')
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    receipt: Mapped["Receipt"] = relationship(back_populates="items")
    product: Mapped[Optional["Product"]] = relationship("Product", back_populates="receipt_items")
    unit: Mapped[Optional["Unit"]] = relationship("Unit", foreign_keys=[parsed_unit_id])
    inventory_entries: Mapped[list["Inventory"]] = relationship(
        "Inventory", foreign_keys="Inventory.receipt_item_id", back_populates="receipt_item"
    )