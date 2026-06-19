from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    app_name: str = "nerv-pantry"
    app_version: str = "0.1.0"
    debug: bool = False

    # Database
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "nerv_pantry"
    postgres_user: str = "pantry_user"
    postgres_password: str = "changeme"

    # Security
    api_key: str = "changeme"

    # Storage
    images_path: str = "/data/images"
    max_image_size_mb: int = 10
    image_retention_days: int = 90

    # Open Food Facts
    off_api_url: str = "https://world.openfoodfacts.org/api/v2"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
