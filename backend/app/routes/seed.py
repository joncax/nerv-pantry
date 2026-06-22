from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.config import Location, Category, Unit, Store, MealType

router = APIRouter()


@router.post("/seed", status_code=201)
def seed_initial_data(db: Session = Depends(get_db)):
    """Popula a BD com dados iniciais. Seguro de correr múltiplas vezes."""
    created = {"locations": 0, "categories": 0, "units": 0, "stores": 0, "meal_types": 0}

    # ─── Localizações ────────────────────────────────────────────
    locations = [
        {"name": "Despensa",    "icon": "📦", "color": "#8b949e"},
        {"name": "Frigorífico", "icon": "🧊", "color": "#58a6ff"},
        {"name": "Congelador",  "icon": "❄️",  "color": "#79c0ff"},
        {"name": "Armário",     "icon": "🗄️",  "color": "#d29922"},
    ]
    for loc in locations:
        exists = db.query(Location).filter(Location.name == loc["name"]).first()
        if not exists:
            db.add(Location(**loc))
            created["locations"] += 1

    # ─── Categorias ──────────────────────────────────────────────
    categories = [
        {"name": "Laticínios",      "icon": "🥛", "color": "#f0e68c"},
        {"name": "Legumes",         "icon": "🥦", "color": "#3fb950"},
        {"name": "Fruta",           "icon": "🍎", "color": "#ef4444"},
        {"name": "Carnes & Peixe",  "icon": "🥩", "color": "#f85149"},
        {"name": "Padaria",         "icon": "🍞", "color": "#d29922"},
        {"name": "Bebidas",         "icon": "🧃", "color": "#58a6ff"},
        {"name": "Conservas",       "icon": "🥫", "color": "#8b949e"},
        {"name": "Cereais & Massa", "icon": "🌾", "color": "#d2a679"},
        {"name": "Congelados",      "icon": "🧊", "color": "#79c0ff"},
        {"name": "Higiene & Limpeza","icon": "🧴", "color": "#bc8cff"},
        {"name": "Outros",          "icon": "📦", "color": "#6e7681"},
    ]
    for cat in categories:
        exists = db.query(Category).filter(Category.name == cat["name"]).first()
        if not exists:
            db.add(Category(**cat))
            created["categories"] += 1

    # ─── Unidades ────────────────────────────────────────────────
    units = [
        {"name": "Unidade",     "abbreviation": "un",  "type": "unidade"},
        {"name": "Grama",       "abbreviation": "g",   "type": "peso"},
        {"name": "Kilograma",   "abbreviation": "kg",  "type": "peso"},
        {"name": "Mililitro",   "abbreviation": "ml",  "type": "volume"},
        {"name": "Litro",       "abbreviation": "L",   "type": "volume"},
        {"name": "Pacote",      "abbreviation": "pct", "type": "unidade"},
        {"name": "Caixa",       "abbreviation": "cx",  "type": "unidade"},
        {"name": "Lata",        "abbreviation": "lt",  "type": "unidade"},
    ]
    for unit in units:
        exists = db.query(Unit).filter(Unit.name == unit["name"]).first()
        if not exists:
            db.add(Unit(**unit))
            created["units"] += 1

    # ─── Lojas ───────────────────────────────────────────────────
    stores = [
        {"name": "Lidl"},
        {"name": "Continente"},
        {"name": "Pingo Doce"},
        {"name": "Aldi"},
        {"name": "Intermarché"},
        {"name": "Mercadona"},
        {"name": "Minipreço"},
        {"name": "Jumbo"},
    ]
    for store in stores:
        exists = db.query(Store).filter(Store.name == store["name"]).first()
        if not exists:
            db.add(Store(**store))
            created["stores"] += 1

    # ─── Tipos de refeição ───────────────────────────────────────
    meal_types = [
        {"name": "Pequeno-almoço", "default_time": "07:30", "icon": "🌅", "order": 1},
        {"name": "Almoço",         "default_time": "13:00", "icon": "☀️",  "order": 2},
        {"name": "Lanche",         "default_time": "16:30", "icon": "🍎", "order": 3},
        {"name": "Jantar",         "default_time": "20:00", "icon": "🌙", "order": 4},
        {"name": "Ceia",           "default_time": "22:00", "icon": "⭐", "order": 5},
    ]
    for mt in meal_types:
        exists = db.query(MealType).filter(MealType.name == mt["name"]).first()
        if not exists:
            db.add(MealType(**mt))
            created["meal_types"] += 1

    db.commit()
    return {"message": "Seed concluído", "created": created}


@router.get("/seed/status")
def seed_status(db: Session = Depends(get_db)):
    """Verifica o estado dos dados iniciais."""
    return {
        "locations":  db.query(Location).count(),
        "categories": db.query(Category).count(),
        "units":      db.query(Unit).count(),
        "stores":     db.query(Store).count(),
        "meal_types": db.query(MealType).count(),
    }