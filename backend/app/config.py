from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_env: str = "development"
    debug: bool = False
    secret_key: str = Field(min_length=32)
    database_url: str | None = None
    postgres_host: str = "database"
    postgres_port: int = 5432
    postgres_db: str = "cupcake_db"
    postgres_user: str = "cupcake_user"
    postgres_password: str
    frontend_origin: str = "http://localhost:3000"
    cookie_secure: bool = False
    session_cookie_name: str = "cupcake_session"
    admin_email: str
    admin_password: str = Field(min_length=12)
    media_root: str = "/app/media/products"
    seed_assets: str = "/app/assets/seed-products"

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        from urllib.parse import quote_plus

        return (
            f"postgresql+psycopg://{quote_plus(self.postgres_user)}:"
            f"{quote_plus(self.postgres_password)}@{self.postgres_host}:"
            f"{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()  # type: ignore[call-arg]
