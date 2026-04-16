from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

import cloudinary
import dj_database_url
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def resolve_database_url(database_url: str) -> str:
    sqlite_prefix = "sqlite:///"
    if database_url.startswith(sqlite_prefix):
        sqlite_target = database_url.removeprefix(sqlite_prefix)
        target_path = Path(sqlite_target)
        if not target_path.is_absolute():
            return f"{sqlite_prefix}{(BASE_DIR / target_path).resolve().as_posix()}"
    return database_url

SECRET_KEY = os.getenv("SECRET_KEY", "repairhub-dev-secret-key")
DEBUG = os.getenv("DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = [host.strip() for host in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if host.strip()]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "channels",
    "django_q",
    "common",
    "apps.accounts",
    "apps.repairers",
    "apps.catalog",
    "apps.repairs",
    "apps.ai",
    "apps.payments",
    "apps.chat",
    "apps.community",
    "apps.rewards",
    "apps.admin_ops",
    "apps.notifications",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "apps.accounts.middleware.BootstrapEnvAdminMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "repairhub_api.urls"

TEMPLATES = [
    {
      "BACKEND": "django.template.backends.django.DjangoTemplates",
      "DIRS": [],
      "APP_DIRS": True,
      "OPTIONS": {
          "context_processors": [
              "django.template.context_processors.request",
              "django.contrib.auth.context_processors.auth",
              "django.contrib.messages.context_processors.messages",
          ],
      },
    }
]

WSGI_APPLICATION = "repairhub_api.wsgi.application"
ASGI_APPLICATION = "repairhub_api.asgi.application"

DATABASES = {
    "default": dj_database_url.parse(
        resolve_database_url(os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'db.sqlite3'}")),
        conn_max_age=600,
        ssl_require=False,
    )
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
]

LANGUAGE_CODE = "en-au"
TIME_ZONE = "Australia/Sydney"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.getenv("ACCESS_TOKEN_MINUTES", "30"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.getenv("REFRESH_TOKEN_DAYS", "7"))),
    "TOKEN_OBTAIN_SERIALIZER": "repairhub_api.jwt.RepairHubTokenObtainPairSerializer",
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

Q_CLUSTER = {
    "name": "repairhub",
    "workers": 1,
    "timeout": 90,
    "retry": 120,
    "queue_limit": 50,
    "orm": "default",
}

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)
