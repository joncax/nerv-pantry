from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.config import get_settings
from app.routes import health
from app.routes import config, products, inventory, seed, receipts, meals, barcode, shopping, reports

settings = get_settings()

app = FastAPI(
    title="nerv-pantry",
    description="Home pantry & fridge inventory manager",
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://192.168.1.50:30190",
        "http://192.168.1.71:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir imagens dos talões como ficheiros estáticos
# URL: /images/<nome-do-ficheiro>.jpg
os.makedirs(settings.images_path, exist_ok=True)
app.mount("/images", StaticFiles(directory=settings.images_path), name="images")

app.include_router(health.router,    tags=["system"])
app.include_router(seed.router,      tags=["system"])
app.include_router(config.router,    tags=["config"])
app.include_router(products.router,  tags=["products"])
app.include_router(inventory.router, tags=["inventory"])
app.include_router(receipts.router,  tags=["receipts"])
app.include_router(meals.router,     tags=["meals"])
app.include_router(barcode.router,   tags=["barcode"])
app.include_router(shopping.router,  tags=["shopping"])
app.include_router(reports.router,   tags=["reports"])


@app.get("/")
def root():
    return {"app": settings.app_name, "version": settings.app_version}