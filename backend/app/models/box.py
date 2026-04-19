from datetime import datetime
from ..extensions import db


class Box(db.Model):
    __tablename__ = 'boxes'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    image_url = db.Column(db.String(500))
    category = db.Column(db.String(50))
    client_id = db.Column(db.String(20), default='default')
    price_coins = db.Column(db.Integer, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    total_openings = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship('BoxItem', backref='box', lazy='dynamic')
    openings = db.relationship('BoxOpening', backref='box', lazy='dynamic')

    @property
    def expected_value(self):
        active_items = self.items.filter_by(is_active=True).all()
        if not active_items:
            return 0.0
        total_weight = sum(i.weight for i in active_items)
        if total_weight == 0:
            return 0.0
        return float(sum(
            float(i.product.retail_value) * i.weight / total_weight
            for i in active_items
        ))

    @property
    def house_edge_pct(self):
        ev = self.expected_value
        price = float(self.price)
        if price == 0:
            return 0.0
        return round((1 - ev / price) * 100, 2)

    def to_dict(self, include_items=False):
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': float(self.price),
            'image_url': self.image_url,
            'category': self.category,
            'client_id': self.client_id,
            'price_coins': self.price_coins,
            'total_openings': self.total_openings,
            'expected_value': round(self.expected_value, 2),
            'house_edge_pct': self.house_edge_pct,
            'rtp_pct': round(100 - self.house_edge_pct, 2),
            'created_at': self.created_at.isoformat(),
        }
        if include_items:
            active_items = self.items.filter_by(is_active=True).all()
            total_weight = sum(i.weight for i in active_items)
            data['items'] = [i.to_dict(total_weight) for i in active_items]
        return data


class BoxItem(db.Model):
    __tablename__ = 'box_items'

    id = db.Column(db.Integer, primary_key=True)
    box_id = db.Column(db.Integer, db.ForeignKey('boxes.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    weight = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, default=True)

    product = db.relationship('Product')

    def to_dict(self, total_weight=None):
        data = {
            'id': self.id,
            'weight': self.weight,
            'product': self.product.to_dict(),
        }
        if total_weight and total_weight > 0:
            data['probability_pct'] = round(self.weight / total_weight * 100, 4)
        return data
