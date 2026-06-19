from sqlalchemy import Integer, String, Float, ForeignKey, DateTime, Date, Boolean, Time, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime, date, time
from app.db.database import Base


class Meal(Base):
    __tablename__ = "meals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    meal_type_id: Mapped[int] = mapped_column(ForeignKey("meal_types.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    registered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    meal_type: Mapped["MealType"] = relationship("MealType", back_populates="meals")
    items: Mapped[list["MealItem"]] = relationship(back_populates="meal", cascade="all, delete-orphan")


class MealItem(Base):
    __tablename__ = "meal_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    meal_id: Mapped[int] = mapped_column(ForeignKey("meals.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id"), nullable=False)
    wasted: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    meal: Mapped["Meal"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship("Product", back_populates="meal_items")
    unit: Mapped["Unit"] = relationship("Unit", foreign_keys=[unit_id])
    consumption_log: Mapped[Optional["ConsumptionLog"]] = relationship(back_populates="meal_item")


class ConsumptionLog(Base):
    __tablename__ = "consumption_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    inventory_id: Mapped[Optional[int]] = mapped_column(ForeignKey("inventory.id"), nullable=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity_consumed: Mapped[float] = mapped_column(Float, nullable=False)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id"), nullable=False)
    consumption_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # consumption_type: 'used' | 'wasted' | 'finished'
    meal_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey("meal_items.id"), nullable=True)
    consumed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    inventory: Mapped[Optional["Inventory"]] = relationship("Inventory", back_populates="consumption_logs")
    product: Mapped["Product"] = relationship("Product")
    unit: Mapped["Unit"] = relationship("Unit", foreign_keys=[unit_id])
    meal_item: Mapped[Optional["MealItem"]] = relationship(back_populates="consumption_log")
