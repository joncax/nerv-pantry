from sqlalchemy import Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime
from app.db.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    brand: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    barcode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, unique=True, index=True)
    open_food_facts_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categories.id"), nullable=True)
    default_location_id: Mapped[Optional[int]] = mapped_column(ForeignKey("locations.id"), nullable=True)
    default_unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("units.id"), nullable=True)
    default_quantity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Consumption profile
    consumption_type: Mapped[str] = mapped_column(String(20), default="partial")
    # consumption_type: 'single_use' | 'partial' | 'fresh_perishable'
    perishable_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    alert_days_before: Mapped[int] = mapped_column(Integer, default=2)

    # Shopping list thresholds
    min_stock_quantity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    min_stock_unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("units.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    category: Mapped[Optional["Category"]] = relationship("Category", back_populates="products")
    default_location: Mapped[Optional["Location"]] = relationship("Location", foreign_keys=[default_location_id])
    default_unit: Mapped[Optional["Unit"]] = relationship("Unit", foreign_keys=[default_unit_id])
    inventory: Mapped[list["Inventory"]] = relationship(back_populates="product")
    ocr_mappings: Mapped[list["ProductOCRMapping"]] = relationship(back_populates="product")
    receipt_items: Mapped[list["ReceiptItem"]] = relationship(back_populates="product")
    meal_items: Mapped[list["MealItem"]] = relationship(back_populates="product")
    shopping_list: Mapped[list["ShoppingList"]] = relationship(back_populates="product")
    shopping_rules: Mapped[list["ShoppingRule"]] = relationship(back_populates="product")


class ProductOCRMapping(Base):
    __tablename__ = "product_ocr_mappings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    raw_text: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    store_id: Mapped[Optional[int]] = mapped_column(ForeignKey("stores.id"), nullable=True)
    confidence: Mapped[int] = mapped_column(Integer, default=50)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    product: Mapped["Product"] = relationship(back_populates="ocr_mappings")
    store: Mapped[Optional["Store"]] = relationship("Store", back_populates="ocr_mappings")
