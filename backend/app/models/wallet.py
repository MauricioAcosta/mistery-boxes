from datetime import datetime
from ..extensions import db


class Wallet(db.Model):
    __tablename__ = 'wallets'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    balance = db.Column(db.Numeric(10, 2), default=0.00)
    coins = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    transactions = db.relationship(
        'Transaction', backref='wallet', lazy='dynamic',
        order_by='Transaction.created_at.desc()'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'balance': float(self.balance),
            'coins': self.coins or 0,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Transaction(db.Model):
    __tablename__ = 'transactions'

    id = db.Column(db.Integer, primary_key=True)
    wallet_id = db.Column(db.Integer, db.ForeignKey('wallets.id'), nullable=False)
    # deposit | box_open | exchange | withdraw
    type = db.Column(db.String(20), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    balance_after = db.Column(db.Numeric(10, 2), nullable=False)
    description = db.Column(db.String(255))
    reference_id = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'amount': float(self.amount),
            'balance_after': float(self.balance_after),
            'description': self.description,
            'created_at': self.created_at.isoformat(),
        }
