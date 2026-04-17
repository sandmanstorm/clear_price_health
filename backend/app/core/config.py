from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "ClearPrice"
    APP_ENV: str = "production"
    APP_SECRET_KEY: str
    ENCRYPTION_KEY: str
    FRONTEND_URL: str = "https://clearpricehealth.org"
    BACKEND_URL: str = "http://10.10.100.33:8000"
    DATABASE_URL: str
    DATABASE_URL_SYNC: str
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    FIRST_ADMIN_EMAIL: str = ""
    FIRST_ADMIN_PASSWORD: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
