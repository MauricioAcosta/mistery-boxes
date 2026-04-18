from datetime import datetime
from ..extensions import db


class Product(db.Model):
    __tablename__ = 'products'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    image_url = db.Column(db.String(500))
    retail_value = db.Column(db.Numeric(10, 2), nullable=False)
    category = db.Column(db.String(50))
    brand = db.Column(db.String(50))
    # common | uncommon | rare | epic | legendary
    rarity = db.Column(db.String(20), default='common')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'image_url': self.image_url,
            'retail_value': float(self.retail_value),
            'category': self.category,
            'brand': self.brand,
            'rarity': self.rarity,
        }
