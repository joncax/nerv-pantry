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
    ReceiptUploadResponse, ReceiptConfirmRequest, ReceiptResponse, ParsedItemSchema,
    ReceiptItemResponse, ReceiptItemCreate, ReceiptItemUpdate, ReceiptUpdate,
)

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


# ---------------------------------------------------------------------------
# UPLOAD + OCR
# ---------------------------------------------------------------------------

@router.post("/receipts/upload", response_model=ReceiptUploadResponse)
async def upload_receipt(
    file: UploadFile = File(...),
    store_id: Optional[int] = Form(default=None),
    db: Session = Depends(get_db),
):
    """Faz upload de um talão, corre OCR e retorna os itens parseados para confirmação."""

    if file.content_type not in ["image/jpeg", "image/png", "image/webp", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Formato não suportado. Use JPG, PNG ou WebP.")

    image_data = await file.read()
    if len(image_data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Ficheiro demasiado grande (máximo 10MB).")

    image_path = save_image(image_data)

    try:
        raw_text = extract_text(image_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no OCR: {str(e)}")

    parsed_items = parse_receipt_text(raw_text)
    detected_store = detect_store(raw_text)

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


# ---------------------------------------------------------------------------
# CONFIRMAR TALÃO
# ---------------------------------------------------------------------------

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

    if receipt.status == "confirmed":
        raise HTTPException(status_code=400, detail="Talão já confirmado")

    total_amount = 0.0
    total_savings = 0.0

    for item_data in data.items:
        # Linhas de desconto: contabilizar poupança e saltar
        if item_data.is_discount_line:
            total_savings += item_data.discount_amount or 0
            continue

        # Linhas sem nome (rodapé OCR, texto não reconhecido): ignorar
        if not item_data.parsed_name or not item_data.parsed_name.strip():
            continue

        # Criar ou usar produto existente
        product_id = item_data.product_id
        if not product_id and item_data.parsed_name:
            product = Product(
                name=item_data.parsed_name,
                consumption_type="partial",
            )
            db.add(product)
            db.flush()
            product_id = product.id

        # Determinar unidade
        unit_id = item_data.unit_id
        unit_guess = getattr(item_data, 'unit_guess', None)
        if not unit_id and unit_guess:
            unit = db.query(Unit).filter(Unit.abbreviation == unit_guess).first()
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
            add_to_inventory=item_data.add_to_inventory,
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

    receipt.store_id = data.store_id or receipt.store_id
    receipt.purchase_date = data.purchase_date
    receipt.total_amount = round(total_amount, 2)
    receipt.total_savings = round(total_savings, 2)
    receipt.status = "confirmed"
    receipt.processed_at = datetime.utcnow()

    db.commit()
    db.refresh(receipt)
    return receipt


# ---------------------------------------------------------------------------
# LISTAR TALÕES
# ---------------------------------------------------------------------------

@router.get("/receipts", response_model=list[ReceiptResponse])
def get_receipts(db: Session = Depends(get_db)):
    return db.query(Receipt).order_by(Receipt.created_at.desc()).limit(50).all()


@router.get("/receipts/{receipt_id}", response_model=ReceiptResponse)
def get_receipt(receipt_id: int, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Talão não encontrado")
    return receipt


# ---------------------------------------------------------------------------
# U1-B: EDITAR / APAGAR TALÃO
# ---------------------------------------------------------------------------

@router.put("/receipts/{receipt_id}", response_model=ReceiptResponse)
def update_receipt(
    receipt_id: int,
    data: ReceiptUpdate,
    db: Session = Depends(get_db),
):
    """Atualiza metadados de um talão (loja e data de compra). Auto-save."""
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Talão não encontrado")

    if data.store_id is not None:
        receipt.store_id = data.store_id
    if data.purchase_date is not None:
        receipt.purchase_date = data.purchase_date

    db.commit()
    db.refresh(receipt)
    return receipt


@router.delete("/receipts/{receipt_id}")
def delete_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
):
    """Apaga um talão e os seus itens. O stock NÃO é afetado — apenas o registo histórico é removido."""
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Talão não encontrado")

    # Preservar o stock: desligar a referência receipt_item_id nos
    # itens de inventário antes de apagar o talão
    for item in receipt.items:
        for inv_entry in item.inventory_entries:
            inv_entry.receipt_item_id = None

    db.delete(receipt)  # cascade elimina os ReceiptItems
    db.commit()
    return {"message": "Talão eliminado. Stock mantém-se inalterado."}


# ---------------------------------------------------------------------------
# U1-B: ITEMS DO TALÃO — CRUD
# ---------------------------------------------------------------------------

@router.get("/receipts/{receipt_id}/items", response_model=list[ReceiptItemResponse])
def get_receipt_items(
    receipt_id: int,
    db: Session = Depends(get_db),
):
    """Lista todos os items de um talão (pending ou confirmed)."""
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Talão não encontrado")

    return db.query(ReceiptItem).filter(
        ReceiptItem.receipt_id == receipt_id
    ).order_by(ReceiptItem.id.asc()).all()


@router.post("/receipts/{receipt_id}/items", response_model=ReceiptItemResponse)
def add_receipt_item(
    receipt_id: int,
    data: ReceiptItemCreate,
    db: Session = Depends(get_db),
):
    """Adiciona um item manual a um talão pending."""
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Talão não encontrado")

    # Determinar unidade
    unit_id = data.unit_id
    if not unit_id and data.unit_guess:
        unit = db.query(Unit).filter(Unit.abbreviation == data.unit_guess).first()
        if unit:
            unit_id = unit.id
    if not unit_id:
        unit = db.query(Unit).filter(Unit.abbreviation == "un").first()
        unit_id = unit.id if unit else 1

    item = ReceiptItem(
        receipt_id=receipt_id,
        raw_text=f"[manual] {data.parsed_name}",
        parsed_name=data.parsed_name,
        parsed_quantity=data.parsed_quantity or 1.0,
        parsed_unit_id=unit_id,
        unit_guess=data.unit_guess,
        original_price=data.original_price,
        effective_price=data.effective_price or data.original_price,
        is_discount_line=False,
        is_manual=True,
        confirmed=False,
        add_to_inventory=data.add_to_inventory,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/receipts/{receipt_id}/items/{item_id}", response_model=ReceiptItemResponse)
def update_receipt_item(
    receipt_id: int,
    item_id: int,
    data: ReceiptItemUpdate,
    db: Session = Depends(get_db),
):
    """Atualiza campos de um item. Usado pelo auto-save durante revisão (pending) e edição de histórico (confirmed)."""
    item = db.query(ReceiptItem).filter(
        ReceiptItem.id == item_id,
        ReceiptItem.receipt_id == receipt_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    # Atualizar apenas os campos enviados (PATCH semântico)
    if data.parsed_name is not None:
        item.parsed_name = data.parsed_name
    if data.parsed_quantity is not None:
        item.parsed_quantity = data.parsed_quantity
    if data.unit_id is not None:
        item.parsed_unit_id = data.unit_id
    if data.unit_guess is not None:
        item.unit_guess = data.unit_guess
    if data.original_price is not None:
        item.original_price = data.original_price
    if data.discount_amount is not None:
        item.discount_amount = data.discount_amount
    if data.discount_type is not None:
        item.discount_type = data.discount_type
    if data.effective_price is not None:
        item.effective_price = data.effective_price
    if data.add_to_inventory is not None:
        item.add_to_inventory = data.add_to_inventory
    if data.confirmed is not None:
        item.confirmed = data.confirmed

    db.commit()
    db.refresh(item)
    return item


@router.delete("/receipts/{receipt_id}/items/{item_id}")
def delete_receipt_item(
    receipt_id: int,
    item_id: int,
    db: Session = Depends(get_db),
):
    """Remove um item de um talão. Não afeta o inventário."""
    item = db.query(ReceiptItem).filter(
        ReceiptItem.id == item_id,
        ReceiptItem.receipt_id == receipt_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    # Desligar referência no inventário antes de apagar
    for inv_entry in item.inventory_entries:
        inv_entry.receipt_item_id = None

    db.delete(item)
    db.commit()
    return {"message": "Item removido"}