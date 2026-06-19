from sqlalchemy import Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime
from app.db.database import Base


class ShoppingList(Base):
    __tablename__ = "shopping_list"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity_needed: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id"), nullable=False)
    priority: Mapped[str] = mapped_column(String(10), default="medium")
    # priority: 'high' | 'medium' | 'low'
    added_automatically: Mapped[bool] = mapped_column(Boolean, default=False)
    trigger_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # trigger: 'manual' | 'min_stock' | 'finished' | 'expired' | 'pattern' | 'wasted'
    estimated_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    checked: Mapped[bool] = mapped_column(Boolean, default=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="shopping_list")
    unit: Mapped["Unit"] = relationship("Unit", foreign_keys=[unit_id])


class ShoppingRule(Base):
    __tablename__ = "shopping_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, unique=True)
    min_quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id"), nullable=False)
    reorder_quantity: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="shopping_rules")
    unit: Mapped["Unit"] = relationship("Unit", foreign_keys=[unit_id])
