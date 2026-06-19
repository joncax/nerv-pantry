from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.product import Product
from app.services.open_food_facts import lookup_barcode

router = APIRouter()


@router.get("/barcode/{barcode}")
async def lookup_product_barcode(barcode: str, db: Session = Depends(get_db)):
    """
    Procura um produto pelo código de barras.
    1. Verifica primeiro na BD local
    2. Se não encontrar, consulta Open Food Facts
    """
    # 1. Verificar BD local
    local = db.query(Product).filter(Product.barcode == barcode).first()
    if local:
        return {
            "source": "local",
            "product_id": local.id,
            "name": local.name,
            "brand": local.brand,
            "barcode": barcode,
            "category_hint": None,
        }

    # 2. Consultar Open Food Facts
    off_data = await lookup_barcode(barcode)
    if off_data:
        return {
            "source": "open_food_facts",
            "product_id": None,
            **off_data,
        }

    raise HTTPException(
        status_code=404,
        detail="Produto não encontrado localmente nem no Open Food Facts"
    )
