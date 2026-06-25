from __future__ import annotations

import datetime
from typing import Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    brand: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    barcode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, unique=True)
    open_food_facts_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categories.id"), nullable=True)
    default_location_id: Mapped[Optional[int]] = mapped_column(ForeignKey("locations.id"), nullable=True)
    default_unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("units.id"), nullable=True)
    min_stock_unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("units.id"), nullable=True)

    default_quantity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    consumption_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    perishable_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    alert_days_before: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    min_stock_quantity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # U5-A: sistema de favoritos
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)

    # Relationships
    category = relationship("Category", foreign_keys=[category_id])
    default_location = relationship("Location", foreign_keys=[default_location_id])
    default_unit = relationship("Unit", foreign_keys=[default_unit_id])
    min_stock_unit = relationship("Unit", foreign_keys=[min_stock_unit_id])
    inventory_items = relationship("Inventory", back_populates="product")
    receipt_items = relationship("ReceiptItem", back_populates="product")
    ocr_mappings = relationship("ProductOCRMapping", back_populates="product")
    shopping_list_items = relationship("ShoppingList", back_populates="product")
    meal_items = relationship("MealItem", back_populates="product")  # ← adicionar


class ProductOCRMapping(Base):
    __tablename__ = "product_ocr_mappings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    raw_text: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    store_id: Mapped[Optional[int]] = mapped_column(ForeignKey("stores.id"), nullable=True)
    confidence: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="ocr_mappings")
    store = relationship("Store", foreign_keys=[store_id])