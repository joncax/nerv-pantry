from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.db.database import get_db
from app.models.receipt import Receipt, ReceiptItem
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.config import Unit
from app.services.ocr_service import extract_text, save_image
from app.services.parser_service import parse_receipt_text, detect_store
from app.schemas.receipt import (
    ReceiptUploadResponse, ReceiptConfirmRequest, ReceiptResponse, ParsedItemSchema
)

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/receipts/upload", response_model=ReceiptUploadResponse)
async def upload_receipt(
    file: UploadFile = File(...),
    store_id: Optional[int] = Form(default=None),
    db: Session = Depends(get_db),
):
    """Faz upload de um talão, corre OCR e retorna os itens parseados para confirmação."""

    # Validar tipo de ficheiro
    if file.content_type not in ["image/jpeg", "image/png", "image/webp", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Formato não suportado. Use JPG, PNG ou WebP.")

    # Ler e validar tamanho
    image_data = await file.read()
    if len(image_data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Ficheiro demasiado grande (máximo 10MB).")

    # Guardar imagem
    image_path = save_image(image_data)

    # Correr OCR
    try:
        raw_text = extract_text(image_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no OCR: {str(e)}")

    # Parsear texto
    parsed_items = parse_receipt_text(raw_text)
    detected_store = detect_store(raw_text)

    # Criar registo do talão na BD (status: pending)
    receipt = Receipt(
        store_id=store_id,
        image_path=image_path,
        raw_ocr_text=raw_text,
        status="pending",
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    return ReceiptUploadResponse(
        receipt_id=receipt.id,
        detected_store=detected_store,
        image_path=image_path,
        raw_text=raw_text,
        items=[ParsedItemSchema(**vars(item)) for item in parsed_items],
        total_items=len([i for i in parsed_items if not i.is_discount_line]),
        status="pending",
    )


@router.post("/receipts/{receipt_id}/confirm", response_model=ReceiptResponse)
def confirm_receipt(
    receipt_id: int,
    data: ReceiptConfirmRequest,
    db: Session = Depends(get_db),
):
    """Confirma os itens do talão e entra no inventário."""

    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Talão não encontrado")

    total_amount = 0.0
    total_savings = 0.0

    for item_data in data.items:
        # Linhas de desconto: contabilizar poupança e saltar
        if item_data.is_discount_line:
            total_savings += item_data.discount_amount or 0
            continue

        # Linhas sem nome (rodapé OCR, texto não reconhecido): ignorar completamente
        if not item_data.parsed_name or not item_data.parsed_name.strip():
            continue

        # Criar ou usar produto existente
        product_id = item_data.product_id
        if not product_id and item_data.parsed_name:
            # Criar produto novo automaticamente
            product = Product(
                name=item_data.parsed_name,
                consumption_type="partial",
            )
            db.add(product)
            db.flush()
            product_id = product.id

        # Determinar unidade
        unit_id = item_data.unit_id
        if not unit_id and item_data.unit_guess:
            unit = db.query(Unit).filter(
                Unit.abbreviation == item_data.unit_guess
            ).first()
            if unit:
                unit_id = unit.id
        if not unit_id:
            unit = db.query(Unit).filter(Unit.abbreviation == "un").first()
            unit_id = unit.id if unit else 1

        # Guardar item do talão
        receipt_item = ReceiptItem(
            receipt_id=receipt_id,
            raw_text=item_data.raw_text,
            parsed_name=item_data.parsed_name,
            parsed_quantity=item_data.parsed_quantity,
            parsed_unit_id=unit_id,
            original_price=item_data.original_price,
            discount_amount=item_data.discount_amount,
            discount_type=item_data.discount_type,
            effective_price=item_data.effective_price or item_data.original_price,
            product_id=product_id,
            is_discount_line=False,
            confirmed=item_data.confirmed,
        )
        db.add(receipt_item)
        db.flush()

        total_amount += item_data.effective_price or item_data.original_price or 0

        # Adicionar ao inventário
        if item_data.add_to_inventory and product_id and item_data.confirmed:
            inv = Inventory(
                product_id=product_id,
                location_id=item_data.location_id or 1,
                quantity=item_data.parsed_quantity or 1.0,
                unit_id=unit_id,
                expiry_date=item_data.expiry_date,
                purchase_date=data.purchase_date,
                purchase_price=item_data.effective_price,
                receipt_item_id=receipt_item.id,
            )
            db.add(inv)

    # Atualizar talão
    receipt.store_id = data.store_id or receipt.store_id
    receipt.purchase_date = data.purchase_date
    receipt.total_amount = round(total_amount, 2)
    receipt.total_savings = round(total_savings, 2)
    receipt.status = "confirmed"
    receipt.processed_at = datetime.utcnow()

    db.commit()
    db.refresh(receipt)
    return receipt


@router.get("/receipts", response_model=list[ReceiptResponse])
def get_receipts(db: Session = Depends(get_db)):
    return db.query(Receipt).order_by(Receipt.created_at.desc()).limit(50).all()


@router.get("/receipts/{receipt_id}", response_model=ReceiptResponse)
def get_receipt(receipt_id: int, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Talão não encontrado")
    return receipt