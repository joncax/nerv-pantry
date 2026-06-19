from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "error"

    return {
        "status": "online",
        "app": settings.app_name,
        "version": settings.app_version,
        "db": db_status,
    }
