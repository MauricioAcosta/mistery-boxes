import os
from datetime import timedelta


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-change-in-prod')

    # Neon y Railway devuelven "postgres://" — SQLAlchemy 2.x requiere "postgresql://"
    _db_url = os.getenv('DATABASE_URL', 'postgresql://mbuser:changeme_in_production@db:5432/mysteryboxes')
    SQLALCHEMY_DATABASE_URI = _db_url.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-change-in-prod')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

    # Resend (email transaccional)
    RESEND_API_KEY   = os.getenv('RESEND_API_KEY', '')
    MAIL_FROM        = os.getenv('MAIL_FROM', 'Mystery Boxes <noreply@mysteryboxes.com>')
    FRONTEND_URL     = os.getenv('FRONTEND_URL', 'https://frontend-eight-zeta-74.vercel.app')


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)


config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
}
