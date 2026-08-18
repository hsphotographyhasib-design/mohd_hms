"""
Application configuration using Pydantic Settings.

MOHD.HMS ENTERPRISE — Multi-tenant Facility Management System

All configuration is loaded from environment variables with sensible defaults.
Use .env file for local development.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    """Core application settings."""

    model_config = SettingsConfigDict(env_prefix="", env_file=".env", env_file_encoding="utf-8")

    app_env: str = Field(default="production", alias="APP_ENV")
    app_name: str = Field(default="MOHD.HMS ENTERPRISE", alias="APP_NAME")
    app_version: str = Field(default="1.0.0", alias="APP_VERSION")
    port: int = Field(default=8000, alias="PORT")
    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")
    jwt_secret: str = Field(default="change-me-in-production", alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_access_token_expire: int = Field(default=604800, alias="JWT_ACCESS_TOKEN_EXPIRE")  # 7 days in seconds

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """Parse CORS origins from comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


class SupabaseSettings(BaseSettings):
    """Supabase / PostgreSQL connection settings."""

    model_config = SettingsConfigDict(env_prefix="", env_file=".env", env_file_encoding="utf-8")

    supabase_url: str = Field(default="", alias="SUPABASE_URL")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_anon_key: str = Field(default="", alias="SUPABASE_ANON_KEY")


class RedisSettings(BaseSettings):
    """Upstash Redis settings (optional)."""

    model_config = SettingsConfigDict(env_prefix="", env_file=".env", env_file_encoding="utf-8")

    redis_url: str | None = Field(default=None, alias="UPSTASH_REDIS_REST_URL")
    redis_token: str | None = Field(default=None, alias="UPSTASH_REDIS_REST_TOKEN")

    @property
    def is_configured(self) -> bool:
        return bool(self.redis_url and self.redis_token)


class FirebaseSettings(BaseSettings):
    """Firebase settings (optional)."""

    model_config = SettingsConfigDict(env_prefix="", env_file=".env", env_file_encoding="utf-8")

    firebase_project_id: str | None = Field(default=None, alias="FIREBASE_PROJECT_ID")
    firebase_client_email: str | None = Field(default=None, alias="FIREBASE_CLIENT_EMAIL")
    firebase_private_key: str | None = Field(default=None, alias="FIREBASE_PRIVATE_KEY")

    @property
    def is_configured(self) -> bool:
        return bool(self.firebase_project_id and self.firebase_client_email and self.firebase_private_key)


class GoogleSettings(BaseSettings):
    """Google OAuth / Maps settings (optional)."""

    model_config = SettingsConfigDict(env_prefix="", env_file=".env", env_file_encoding="utf-8")

    google_client_id: str | None = Field(default=None, alias="GOOGLE_CLIENT_ID")
    google_client_secret: str | None = Field(default=None, alias="GOOGLE_CLIENT_SECRET")

    @property
    def is_configured(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)


class EmailSettings(BaseSettings):
    """SMTP email settings (optional)."""

    model_config = SettingsConfigDict(env_prefix="", env_file=".env", env_file_encoding="utf-8")

    email_host: str | None = Field(default=None, alias="EMAIL_HOST")
    email_port: int = Field(default=587, alias="EMAIL_PORT")
    email_username: str | None = Field(default=None, alias="EMAIL_USERNAME")
    email_password: str | None = Field(default=None, alias="EMAIL_PASSWORD")

    @property
    def is_configured(self) -> bool:
        return bool(self.email_host and self.email_username and self.email_password)


class WhatsAppSettings(BaseSettings):
    """WhatsApp Business API settings (optional)."""

    model_config = SettingsConfigDict(env_prefix="", env_file=".env", env_file_encoding="utf-8")

    whatsapp_api_url: str | None = Field(default=None, alias="WHATSAPP_API_URL")
    whatsapp_token: str | None = Field(default=None, alias="WHATSAPP_TOKEN")

    @property
    def is_configured(self) -> bool:
        return bool(self.whatsapp_api_url and self.whatsapp_token)


class MapsSettings(BaseSettings):
    """Google Maps API settings (optional)."""

    model_config = SettingsConfigDict(env_prefix="", env_file=".env", env_file_encoding="utf-8")

    google_maps_api_key: str | None = Field(default=None, alias="GOOGLE_MAPS_API_KEY")

    @property
    def is_configured(self) -> bool:
        return bool(self.google_maps_api_key)


class Settings(
    AppSettings,
    SupabaseSettings,
    RedisSettings,
    FirebaseSettings,
    GoogleSettings,
    EmailSettings,
    WhatsAppSettings,
    MapsSettings,
):
    """Aggregated settings from all sub-settings classes.

    Each sub-setting group reads its own env vars. This class
    composes them into a single cached singleton.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Explicit configuration checks (avoid MRO collision with is_configured) ──

    @property
    def redis_configured(self) -> bool:
        return bool(self.redis_url and self.redis_token)

    @property
    def firebase_configured(self) -> bool:
        return bool(self.firebase_project_id and self.firebase_client_email and self.firebase_private_key)

    @property
    def google_configured(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def email_configured(self) -> bool:
        return bool(self.email_host and self.email_username and self.email_password)

    @property
    def whatsapp_configured(self) -> bool:
        return bool(self.whatsapp_api_url and self.whatsapp_token)

    @property
    def maps_configured(self) -> bool:
        return bool(self.google_maps_api_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings singleton.

    The @lru_cache ensures settings are parsed from env vars only once
    per process. Call this everywhere instead of instantiating Settings.
    """
    return Settings()
