from __future__ import annotations

import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class ShoppingList(Base):
    __tablename__ = "shopping_list"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # U5-A: nullable para suportar itens manuais de texto livre
    product_id: Mapped[Optional[int]] = mapped_column(ForeignKey("products.id"), nullable=True)

    # U5-A: nome para itens manuais (ou cache do nome do produto)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    quantity_needed: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("units.id"), nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)
    added_automatically: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    trigger_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    estimated_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    checked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)

    # Relationships
    product = relationship("Product", foreign_keys=[product_id], back_populates="shopping_list_items")
    unit = relationship("Unit", foreign_keys=[unit_id])


class ShoppingRule(Base):
    __tablename__ = "shopping_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    min_quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id"), nullable=False)
    reorder_quantity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    product = relationship("Product", foreign_keys=[product_id])
    unit = relationship("Unit", foreign_keys=[unit_id])