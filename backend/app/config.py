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

    # Flask-Mail (SMTP)
    MAIL_SERVER   = os.getenv('MAIL_SERVER',   'smtp.gmail.com')
    MAIL_PORT     = int(os.getenv('MAIL_PORT', '587'))
    MAIL_USE_TLS  = os.getenv('MAIL_USE_TLS',  'true').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', os.getenv('MAIL_USERNAME', ''))

    FRONTEND_URL  = os.getenv('FRONTEND_URL', 'https://frontend-eight-zeta-74.vercel.app')


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
