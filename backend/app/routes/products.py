from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.db.database import get_db
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse

router = APIRouter()


@router.get("/products", response_model=list[ProductResponse])
def get_products(
    search: str = Query(default="", description="Pesquisar por nome"),
    category_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.default_location),
        joinedload(Product.default_unit),
    )
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    if category_id:
        query = query.filter(Product.category_id == category_id)
    return query.order_by(Product.name).all()


@router.get("/products/barcode/{barcode}", response_model=ProductResponse)
def get_product_by_barcode(barcode: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.barcode == barcode).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return product


@router.get("/products/{id}", response_model=ProductResponse)
def get_product(id: int, db: Session = Depends(get_db)):
    product = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.default_location),
        joinedload(Product.default_unit),
    ).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return product


@router.post("/products", response_model=ProductResponse, status_code=201)
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    # Verificar barcode duplicado
    if data.barcode:
        existing = db.query(Product).filter(Product.barcode == data.barcode).first()
        if existing:
            raise HTTPException(status_code=409, detail="Barcode já existe")
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/products/{id}", response_model=ProductResponse)
def update_product(id: int, data: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{id}", status_code=204)
def delete_product(id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    db.delete(product)
    db.commit()
