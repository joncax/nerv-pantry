from __future__ import annotations

import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Date, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.product import Product


class Inventory(Base):
    __tablename__ = "inventory"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    location_id: Mapped[Optional[int]] = mapped_column(ForeignKey("locations.id"), nullable=True)
    quantity: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("units.id"), nullable=True)
    expiry_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    purchase_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    purchase_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    receipt_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey("receipt_items.id"), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="inventory_items")
    location = relationship("Location", foreign_keys=[location_id])
    unit = relationship("Unit", foreign_keys=[unit_id])
    receipt_item = relationship("ReceiptItem", foreign_keys=[receipt_item_id])
    consumption_logs = relationship("ConsumptionLog", back_populates="inventory")  # ← adicionar

    # U5-A: expõe is_favorite do produto para o schema de inventário
    @property
    def product_is_favorite(self) -> bool:
        return self.product.is_favorite if self.product else False

    # U6-E: expõe a loja do receipt_item → receipt → store
    # Mesmo padrão de product_is_favorite — Pydantic lê via from_attributes
    @property
    def store(self):
        ri = self.receipt_item
        if ri is None:
            return None
        receipt = getattr(ri, 'receipt', None)
        if receipt is None:
            return None
        return getattr(receipt, 'store', None)