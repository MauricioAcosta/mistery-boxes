from datetime import datetime
from ..extensions import db


class UserSeed(db.Model):
    """Provably Fair seed pair for a user. A new pair is created on each rotation."""
    __tablename__ = 'user_seeds'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    server_seed = db.Column(db.String(64), nullable=False)
    server_seed_hash = db.Column(db.String(64), nullable=False)
    client_seed = db.Column(db.String(64), nullable=False)
    nonce = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self, reveal_seed=False):
        data = {
            'id': self.id,
            'server_seed_hash': self.server_seed_hash,
            'client_seed': self.client_seed,
            'nonce': self.nonce,
        }
        if reveal_seed:
            data['server_seed'] = self.server_seed
        return data


class BoxOpening(db.Model):
    """Full audit record for every box opening."""
    __tablename__ = 'box_openings'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    box_id = db.Column(db.Integer, db.ForeignKey('boxes.id'), nullable=False)
    box_item_id = db.Column(db.Integer, db.ForeignKey('box_items.id'), nullable=False)

    # Provably Fair proof (server seed revealed after use)
    server_seed = db.Column(db.String(64), nullable=False)
    server_seed_hash = db.Column(db.String(64), nullable=False)
    client_seed = db.Column(db.String(64), nullable=False)
    nonce = db.Column(db.Integer, nullable=False)
    result_float = db.Column(db.Float, nullable=False)

    # Outcome
    amount_paid = db.Column(db.Numeric(10, 2), nullable=False)
    # pending | exchanged | shipped
    status = db.Column(db.String(20), default='pending')
    exchange_amount = db.Column(db.Numeric(10, 2))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    box_item = db.relationship('BoxItem')

    def to_dict(self):
        return {
            'id': self.id,
            'box_id': self.box_id,
            'box_name': self.box.name if self.box else None,
            'product': self.box_item.product.to_dict() if self.box_item else None,
            'amount_paid': float(self.amount_paid),
            'status': self.status,
            'exchange_amount': float(self.exchange_amount) if self.exchange_amount else None,
            'proof': {
                'server_seed': self.server_seed,
                'server_seed_hash': self.server_seed_hash,
                'client_seed': self.client_seed,
                'nonce': self.nonce,
                'result_float': self.result_float,
            },
            'created_at': self.created_at.isoformat(),
        }
