from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routes import health
from app.routes import config, products, inventory, seed

settings = get_settings()

app = FastAPI(
    title="nerv-pantry",
    description="Home pantry & fridge inventory manager",
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://192.168.1.50:30190",
        "http://192.168.1.60:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router,    tags=["system"])
app.include_router(seed.router,      tags=["system"])
app.include_router(config.router,    tags=["config"])
app.include_router(products.router,  tags=["products"])
app.include_router(inventory.router, tags=["inventory"])


@app.get("/")
def root():
    return {"app": settings.app_name, "version": settings.app_version}
