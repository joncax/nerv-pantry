from sqlalchemy import Integer, String, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from app.db.database import Base


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    inventory: Mapped[list["Inventory"]] = relationship(back_populates="location")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    products: Mapped[list["Product"]] = relationship(back_populates="category")


class Unit(Base):
    __tablename__ = "units"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    abbreviation: Mapped[str] = mapped_column(String(10), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    # type: 'unidade' | 'peso' | 'volume'


class Store(Base):
    __tablename__ = "stores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    parser_config: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)

    receipts: Mapped[list["Receipt"]] = relationship(back_populates="store")
    ocr_mappings: Mapped[list["ProductOCRMapping"]] = relationship(back_populates="store")


class MealType(Base):
    __tablename__ = "meal_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    default_time: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0)

    meals: Mapped[list["Meal"]] = relationship(back_populates="meal_type")
