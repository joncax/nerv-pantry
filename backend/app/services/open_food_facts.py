import httpx
from typing import Optional
from app.config import get_settings

settings = get_settings()


async def lookup_barcode(barcode: str) -> Optional[dict]:
    """Procura um produto pelo código de barras no Open Food Facts."""
    url = f"{settings.off_api_url}/product/{barcode}"
    params = {"fields": "product_name,brands,categories_tags,quantity,image_url"}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params=params)
            if response.status_code != 200:
                return None

            data = response.json()
            if data.get("status") != 1:
                return None

            product = data.get("product", {})
            # Limpar nome da categoria (ex: "en:dairy" → "Laticínios")
            categories = product.get("categories_tags", [])
            category_name = _map_category(categories)

            return {
                "name": product.get("product_name", "").strip(),
                "brand": product.get("brands", "").split(",")[0].strip(),
                "barcode": barcode,
                "category_hint": category_name,
                "quantity_hint": product.get("quantity", ""),
            }
    except Exception:
        return None


def _map_category(tags: list[str]) -> Optional[str]:
    """Mapeia categorias Open Food Facts para categorias nerv-pantry."""
    mapping = {
        "dairy": "Laticínios",
        "beverages": "Bebidas",
        "breads": "Padaria",
        "meats": "Carnes & Peixe",
        "fish": "Carnes & Peixe",
        "fruits": "Fruta",
        "vegetables": "Legumes",
        "cereals": "Cereais & Massa",
        "pasta": "Cereais & Massa",
        "canned": "Conservas",
        "frozen": "Congelados",
        "snacks": "Outros",
        "sweets": "Outros",
    }
    for tag in tags:
        tag_lower = tag.lower()
        for keyword, category in mapping.items():
            if keyword in tag_lower:
                return category
    return None
