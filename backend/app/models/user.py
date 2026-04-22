from datetime import datetime
import bcrypt
from ..extensions import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='user')  # user | admin_provider | super_admin
    provider_client_id = db.Column(db.String(20), nullable=True)   # for admin_provider
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reset_token = db.Column(db.String(100), nullable=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)

    wallet = db.relationship('Wallet', backref='user', uselist=False, cascade='all, delete-orphan')
    openings = db.relationship('BoxOpening', backref='user', lazy='dynamic')
    seeds = db.relationship('UserSeed', backref='user', lazy='dynamic')

    def set_password(self, password: str):
        self.password_hash = bcrypt.hashpw(
            password.encode('utf-8'), bcrypt.gensalt()
        ).decode('utf-8')

    def check_password(self, password: str) -> bool:
        return bcrypt.checkpw(
            password.encode('utf-8'),
            self.password_hash.encode('utf-8')
        )

    def is_admin(self):
        return self.role in ('admin_provider', 'super_admin', 'admin')

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'provider_client_id': self.provider_client_id,
            'created_at': self.created_at.isoformat(),
        }
