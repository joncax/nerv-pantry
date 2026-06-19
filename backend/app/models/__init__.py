# Import all models so SQLAlchemy registers them with Base metadata
# This ensures Alembic detects all tables for migrations

from app.models.config import Location, Category, Unit, Store, MealType
from app.models.product import Product, ProductOCRMapping
from app.models.inventory import Inventory
from app.models.receipt import Receipt, ReceiptItem
from app.models.meal import Meal, MealItem, ConsumptionLog
from app.models.shopping import ShoppingList, ShoppingRule

__all__ = [
    "Location", "Category", "Unit", "Store", "MealType",
    "Product", "ProductOCRMapping",
    "Inventory",
    "Receipt", "ReceiptItem",
    "Meal", "MealItem", "ConsumptionLog",
    "ShoppingList", "ShoppingRule",
]
