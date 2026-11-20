from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    BOT_TOKEN: str = Field(..., description="Telegram bot API tokeni")
    ADMIN_CODE: str = Field("fazliddin0727", description="Admin kirish maxfiy kodi")
    BOT_MODE: str = Field("polling", description="Bot ishlash rejimi (polling yoki webhook)")
    DATABASE_URL: str = Field(..., description="PostgreSQL async ulanish manzili (postgresql+asyncpg://...)")
    REDIS_URL: str = Field("redis://redis:6379/0", description="Redis ulanish manzili")
    WEBAPP_URL: str = Field("https://koreys-bot.156.67.100.36.sslip.io", description="Ilovaning tashqi HTTPS domeni (masalan: https://domain.uz)")
    SECRET_PATH: str = Field("telegram-webhook-path", description="Webhook URL yo'li")
    SECRET_TOKEN: str = Field("secret_token_12345", description="Telegram webhook so'rovlarini tasdiqlovchi maxfiy token")
    ADMIN_SESSION_TTL: int = Field(43200, description="Admin sessiyasi amal qilish muddati (soniyalarda, 12 soat)")
    RATE_LIMIT_REQUESTS: int = Field(30, description="Rate limit so'rovlar soni")
    RATE_LIMIT_WINDOW: int = Field(60, description="Rate limit vaqt oralig'i (soniyalarda)")

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
