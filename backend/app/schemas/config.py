from pydantic import BaseModel, ConfigDict
from typing import Optional


# ─── Location ────────────────────────────────────────────────────
class LocationCreate(BaseModel):
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class LocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None


# ─── Category ────────────────────────────────────────────────────
class CategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None

class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None


# ─── Unit ────────────────────────────────────────────────────────
class UnitCreate(BaseModel):
    name: str
    abbreviation: str
    type: str  # 'unidade' | 'peso' | 'volume'

class UnitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    abbreviation: str
    type: str


# ─── Store ───────────────────────────────────────────────────────
class StoreCreate(BaseModel):
    name: str
    parser_config: Optional[str] = None

class StoreResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    parser_config: Optional[str] = None


# ─── MealType ────────────────────────────────────────────────────
class MealTypeCreate(BaseModel):
    name: str
    default_time: Optional[str] = None
    icon: Optional[str] = None
    order: int = 0

class MealTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    default_time: Optional[str] = None
    icon: Optional[str] = None
    order: int
