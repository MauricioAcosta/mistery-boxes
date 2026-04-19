from functools import wraps
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import User, Product, Box, BoxItem

bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = User.query.get(int(get_jwt_identity()))
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


@bp.route('/products', methods=['GET'])
@admin_required
def list_products():
    return jsonify([p.to_dict() for p in Product.query.all()])


@bp.route('/products', methods=['POST'])
@admin_required
def create_product():
    data = request.get_json(silent=True) or {}
    if not all(k in data for k in ['name', 'retail_value']):
        return jsonify({'error': 'name and retail_value are required'}), 400
    product = Product(
        name=data['name'],
        description=data.get('description', ''),
        image_url=data.get('image_url', ''),
        retail_value=float(data['retail_value']),
        category=data.get('category', 'general'),
        brand=data.get('brand', ''),
        rarity=data.get('rarity', 'common'),
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201


@bp.route('/boxes', methods=['GET'])
@admin_required
def list_boxes():
    return jsonify([b.to_dict(include_items=True) for b in Box.query.all()])


@bp.route('/boxes', methods=['POST'])
@admin_required
def create_box():
    data = request.get_json(silent=True) or {}
    if not all(k in data for k in ['name', 'price']):
        return jsonify({'error': 'name and price are required'}), 400

    box = Box(
        name=data['name'],
        description=data.get('description', ''),
        price=float(data['price']),
        image_url=data.get('image_url', ''),
        category=data.get('category', 'general'),
    )
    db.session.add(box)
    db.session.flush()

    for item_data in data.get('items', []):
        db.session.add(BoxItem(
            box_id=box.id,
            product_id=int(item_data['product_id']),
            weight=int(item_data['weight']),
        ))

    db.session.commit()
    return jsonify(box.to_dict(include_items=True)), 201


@bp.route('/stats', methods=['GET'])
@admin_required
def stats():
    from ..models import BoxOpening, Wallet
    from sqlalchemy import func
    total_users = User.query.count()
    total_openings = BoxOpening.query.count()
    total_revenue = db.session.query(func.sum(BoxOpening.amount_paid)).scalar() or 0
    total_exchanged = db.session.query(func.sum(BoxOpening.exchange_amount))\
        .filter(BoxOpening.status == 'exchanged').scalar() or 0
    return jsonify({
        'total_users': total_users,
        'total_openings': total_openings,
        'total_revenue': float(total_revenue),
        'total_exchanged': float(total_exchanged),
        'gross_profit': float(total_revenue) - float(total_exchanged),
    })
