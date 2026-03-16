import os

from pydantic import BaseModel, Field


class Settings(BaseModel):
    app_name: str = "Housing Plan System"
    app_version: str = "0.1.0"
    database_url: str = Field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL",
            "mysql+pymysql://root:root@localhost:3306/housing_plan",
        )
    )
    jwt_secret_key: str = Field(
        default_factory=lambda: os.getenv(
            "JWT_SECRET_KEY",
            "change-this-secret-in-production",
        )
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    bootstrap_admin_username: str = Field(
        default_factory=lambda: os.getenv("BOOTSTRAP_ADMIN_USERNAME", "admin")
    )
    bootstrap_admin_password: str = Field(
        default_factory=lambda: os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "Admin12345")
    )


settings = Settings()
