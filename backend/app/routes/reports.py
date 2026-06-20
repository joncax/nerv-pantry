from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, date
from app.db.database import get_db
from app.models.meal import ConsumptionLog
from app.models.receipt import Receipt, ReceiptItem
from app.models.product import Product
from app.models.inventory import Inventory

router = APIRouter()


@router.get("/reports/summary")
def get_summary(db: Session = Depends(get_db)):
    """Resumo geral — totais do mês atual."""
    now = datetime.utcnow()
    month, year = now.month, now.year

    # Desperdício do mês
    wasted = db.query(func.count(ConsumptionLog.id)).filter(
        ConsumptionLog.consumption_type == "wasted",
        extract("month", ConsumptionLog.consumed_at) == month,
        extract("year", ConsumptionLog.consumed_at) == year,
    ).scalar() or 0

    # Custo do mês (via talões)
    total_spent = db.query(func.sum(Receipt.total_amount)).filter(
        Receipt.status == "confirmed",
        extract("month", Receipt.created_at) == month,
        extract("year", Receipt.created_at) == year,
    ).scalar() or 0.0

    total_saved = db.query(func.sum(Receipt.total_savings)).filter(
        Receipt.status == "confirmed",
        extract("month", Receipt.created_at) == month,
        extract("year", Receipt.created_at) == year,
    ).scalar() or 0.0

    # Produtos mais consumidos
    top_consumed = (
        db.query(Product.name, func.sum(ConsumptionLog.quantity_consumed).label("total"))
        .join(Product, ConsumptionLog.product_id == Product.id)
        .filter(
            ConsumptionLog.consumption_type.in_(["used", "finished"]),
            extract("month", ConsumptionLog.consumed_at) == month,
            extract("year", ConsumptionLog.consumed_at) == year,
        )
        .group_by(Product.name)
        .order_by(func.sum(ConsumptionLog.quantity_consumed).desc())
        .limit(5)
        .all()
    )

    # Mais desperdiçados
    top_wasted = (
        db.query(Product.name, func.count(ConsumptionLog.id).label("count"))
        .join(Product, ConsumptionLog.product_id == Product.id)
        .filter(ConsumptionLog.consumption_type == "wasted")
        .group_by(Product.name)
        .order_by(func.count(ConsumptionLog.id).desc())
        .limit(5)
        .all()
    )

    # Inventário expirado (valor desperdiçado estimado)
    today = date.today()
    expired_items = db.query(Inventory).filter(
        Inventory.expiry_date < today,
        Inventory.quantity > 0,
    ).all()
    expired_value = sum(
        (i.purchase_price or 0) * i.quantity for i in expired_items
    )

    return {
        "month": f"{year}-{month:02d}",
        "waste": {
            "count": wasted,
            "expired_items": len(expired_items),
            "expired_value_estimate": round(expired_value, 2),
        },
        "costs": {
            "total_spent": round(float(total_spent), 2),
            "total_saved": round(float(total_saved), 2),
            "receipts_count": db.query(Receipt).filter(
                Receipt.status == "confirmed",
                extract("month", Receipt.created_at) == month,
                extract("year", Receipt.created_at) == year,
            ).count(),
        },
        "top_consumed": [{"name": r[0], "quantity": float(r[1])} for r in top_consumed],
        "top_wasted": [{"name": r[0], "count": r[1]} for r in top_wasted],
    }


@router.get("/reports/costs")
def get_cost_history(
    months: int = Query(default=6, ge=1, le=24),
    db: Session = Depends(get_db),
):
    """Histórico de custos mensais (últimos N meses)."""
    result = (
        db.query(
            extract("year", Receipt.created_at).label("year"),
            extract("month", Receipt.created_at).label("month"),
            func.sum(Receipt.total_amount).label("total"),
            func.sum(Receipt.total_savings).label("savings"),
            func.count(Receipt.id).label("receipts"),
        )
        .filter(Receipt.status == "confirmed")
        .group_by("year", "month")
        .order_by("year", "month")
        .limit(months)
        .all()
    )
    return [
        {
            "period": f"{int(r.year)}-{int(r.month):02d}",
            "total_spent": round(float(r.total or 0), 2),
            "total_saved": round(float(r.savings or 0), 2),
            "receipts": r.receipts,
        }
        for r in result
    ]
