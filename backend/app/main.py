from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routes import health

settings = get_settings()

app = FastAPI(
    title="nerv-pantry",
    description="Home pantry & fridge inventory manager",
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# CORS — allow frontend and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://192.168.1.50:30190", "http://192.168.1.60:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, tags=["system"])


@app.get("/")
def root():
    return {"app": settings.app_name, "version": settings.app_version}
