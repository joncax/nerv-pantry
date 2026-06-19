from sqlalchemy import Integer, String, Float, ForeignKey, DateTime, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime, date
from app.db.database import Base


class Inventory(Base):
    __tablename__ = "inventory"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id"), nullable=False)

    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    purchase_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    purchase_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    receipt_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey("receipt_items.id"), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="inventory")
    location: Mapped["Location"] = relationship("Location", back_populates="inventory")
    unit: Mapped["Unit"] = relationship("Unit", foreign_keys=[unit_id])
    receipt_item: Mapped[Optional["ReceiptItem"]] = relationship("ReceiptItem", foreign_keys=[receipt_item_id])
    consumption_logs: Mapped[list["ConsumptionLog"]] = relationship(back_populates="inventory")
