import os
import getpass
from pydantic_settings import BaseSettings
from typing import Optional

try:
    username = getpass.getuser()
except Exception:
    username = "postgres"

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"postgresql://{username}@localhost:5432/postgres")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-jwt-key-for-capability-explorer")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 1 day
    
    # Default Admin Credentials
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin123")
    
    # Groq AI Configurations
    GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY", None)
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    
    class Config:
        env_file = ".env"

settings = Settings()
