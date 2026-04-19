from functools import wraps
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import User, Product, Box, BoxItem, Wallet, PlatformConfig
from ..services.provably_fair import ProvablyFairService
from ..services.probability_engine import ProbabilityEngine

bp = Blueprint('admin', __name__, url_prefix='/api/admin')


# ── Role decorators ────────────────────────────────────────────────────────────

def _get_current_user():
    return db.session.get(User, int(get_jwt_identity()))


def admin_required(fn):
    """Any admin role (admin_provider, super_admin, legacy 'admin')."""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = _get_current_user()
        if not user or not user.is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


def super_admin_required(fn):
    """Only super_admin (or legacy 'admin')."""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = _get_current_user()
        if not user or user.role not in ('super_admin', 'admin'):
            return jsonify({'error': 'Super admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


def _scoped_client_id(user):
    """Return the client_id that this admin may manage.
    super_admin sees all (returns None = no filter).
    admin_provider is limited to their provider_client_id."""
    if user.role in ('super_admin', 'admin'):
        return None   # unrestricted
    return user.provider_client_id


# ── Super-admin: user management ──────────────────────────────────────────────

@bp.route('/users', methods=['GET'])
@super_admin_required
def list_users():
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 30, type=int), 100)
    q = request.args.get('q', '')
    query = User.query
    if q:
        query = query.filter(
            (User.username.ilike(f'%{q}%')) | (User.email.ilike(f'%{q}%'))
        )
    paginated = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        'users': [u.to_dict() for u in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'current_page': page,
    })


@bp.route('/admins', methods=['POST'])
@super_admin_required
def create_admin():
    """Create a provider admin account."""
    data = request.get_json(silent=True) or {}
    required = ['username', 'email', 'password', 'provider_client_id']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({'error': f'Missing: {missing}'}), 400
    if len(data['password']) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already taken'}), 409

    admin = User(
        username=data['username'],
        email=data['email'],
        role='admin_provider',
        provider_client_id=data['provider_client_id'],
    )
    admin.set_password(data['password'])
    db.session.add(admin)
    db.session.flush()
    db.session.add(Wallet(user_id=admin.id))
    db.session.flush()
    ProvablyFairService.create_seed_pair(admin.id)
    db.session.commit()
    return jsonify(admin.to_dict()), 201


# ── Products ───────────────────────────────────────────────────────────────────

@bp.route('/products', methods=['GET'])
@admin_required
def list_products():
    user = _get_current_user()
    client_id = _scoped_client_id(user)
    query = Product.query
    if client_id:
        query = query.filter_by(client_id=client_id)
    return jsonify([p.to_dict() for p in query.all()])


@bp.route('/products', methods=['POST'])
@admin_required
def create_product():
    user = _get_current_user()
    data = request.get_json(silent=True) or {}
    if not all(k in data for k in ['name', 'retail_value']):
        return jsonify({'error': 'name and retail_value are required'}), 400

    client_id = _scoped_client_id(user) or data.get('client_id', 'default')

    product = Product(
        name=data['name'],
        description=data.get('description', ''),
        image_url=data.get('image_url', ''),
        retail_value=float(data['retail_value']),
        category=data.get('category', 'general'),
        brand=data.get('brand', ''),
        rarity=data.get('rarity', 'common'),
        client_id=client_id,
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201


@bp.route('/products/<int:product_id>', methods=['PATCH'])
@admin_required
def update_product(product_id):
    user = _get_current_user()
    client_id = _scoped_client_id(user)
    product = Product.query.get_or_404(product_id)
    if client_id and product.client_id != client_id:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json(silent=True) or {}
    for field in ['name', 'description', 'image_url', 'brand', 'category', 'rarity']:
        if field in data:
            setattr(product, field, data[field])
    if 'retail_value' in data:
        product.retail_value = float(data['retail_value'])
    if 'is_active' in data:
        product.is_active = bool(data['is_active'])
    db.session.commit()
    return jsonify(product.to_dict())


# ── Boxes ──────────────────────────────────────────────────────────────────────

@bp.route('/boxes', methods=['GET'])
@admin_required
def list_boxes():
    user = _get_current_user()
    client_id = _scoped_client_id(user)
    query = Box.query
    if client_id:
        query = query.filter_by(client_id=client_id)
    return jsonify([b.to_dict(include_items=True) for b in query.all()])


@bp.route('/boxes', methods=['POST'])
@admin_required
def create_box():
    user = _get_current_user()
    data = request.get_json(silent=True) or {}
    if not all(k in data for k in ['name', 'price']):
        return jsonify({'error': 'name and price are required'}), 400

    client_id = _scoped_client_id(user) or data.get('client_id', 'default')

    box = Box(
        name=data['name'],
        description=data.get('description', ''),
        price=float(data['price']),
        price_coins=data.get('price_coins'),
        image_url=data.get('image_url', ''),
        category=data.get('category', 'general'),
        client_id=client_id,
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


@bp.route('/boxes/<int:box_id>', methods=['PATCH'])
@admin_required
def update_box(box_id):
    user = _get_current_user()
    client_id = _scoped_client_id(user)
    box = Box.query.get_or_404(box_id)
    if client_id and box.client_id != client_id:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json(silent=True) or {}
    for field in ['name', 'description', 'image_url', 'category']:
        if field in data:
            setattr(box, field, data[field])
    if 'price' in data:
        box.price = float(data['price'])
    if 'price_coins' in data:
        box.price_coins = data['price_coins']
    if 'is_active' in data:
        box.is_active = bool(data['is_active'])

    # Replace items if provided
    if 'items' in data:
        BoxItem.query.filter_by(box_id=box.id).delete()
        for item_data in data['items']:
            db.session.add(BoxItem(
                box_id=box.id,
                product_id=int(item_data['product_id']),
                weight=int(item_data['weight']),
            ))

    db.session.commit()
    return jsonify(box.to_dict(include_items=True))


@bp.route('/boxes/<int:box_id>/toggle', methods=['PATCH'])
@admin_required
def toggle_box(box_id):
    user = _get_current_user()
    client_id = _scoped_client_id(user)
    box = Box.query.get_or_404(box_id)
    if client_id and box.client_id != client_id:
        return jsonify({'error': 'Forbidden'}), 403
    box.is_active = not box.is_active
    db.session.commit()
    return jsonify({'id': box.id, 'is_active': box.is_active})


# ── Stats ─────────────────────────────────────────────────────────────────────

@bp.route('/stats', methods=['GET'])
@admin_required
def stats():
    from ..models import BoxOpening
    from sqlalchemy import func
    user = _get_current_user()
    client_id = _scoped_client_id(user)

    if client_id:
        box_ids = [b.id for b in Box.query.filter_by(client_id=client_id).all()]
        total_openings = BoxOpening.query.filter(BoxOpening.box_id.in_(box_ids)).count()
        total_revenue = db.session.query(func.sum(BoxOpening.amount_paid))\
            .filter(BoxOpening.box_id.in_(box_ids)).scalar() or 0
        total_exchanged = db.session.query(func.sum(BoxOpening.exchange_amount))\
            .filter(BoxOpening.box_id.in_(box_ids),
                    BoxOpening.status.in_(['exchanged', 'sold'])).scalar() or 0
        total_users = User.query.count()
    else:
        total_users = User.query.count()
        total_openings = BoxOpening.query.count()
        total_revenue = db.session.query(func.sum(BoxOpening.amount_paid)).scalar() or 0
        total_exchanged = db.session.query(func.sum(BoxOpening.exchange_amount))\
            .filter(BoxOpening.status.in_(['exchanged', 'sold'])).scalar() or 0

    total_revenue   = float(total_revenue)
    total_exchanged = float(total_exchanged)
    gross_profit    = total_revenue - total_exchanged

    # Actual margin achieved so far
    actual_margin_pct = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0.0

    # Target margin from config
    house_edge_pct  = PlatformConfig.get('house_edge_pct',  cast=float) or 30.0
    margin_strength = PlatformConfig.get('margin_strength', cast=float) or 1.0

    return jsonify({
        'total_users':        total_users,
        'total_openings':     total_openings,
        'total_revenue':      total_revenue,
        'total_exchanged':    total_exchanged,
        'gross_profit':       gross_profit,
        'actual_margin_pct':  round(actual_margin_pct, 2),
        'target_margin_pct':  house_edge_pct,
        'margin_strength':    margin_strength,
    })


# ── Platform config ────────────────────────────────────────────────────────────

@bp.route('/config', methods=['GET'])
@super_admin_required
def get_config():
    """Return all platform config keys with current values."""
    return jsonify(PlatformConfig.all_as_dict())


@bp.route('/config', methods=['PATCH'])
@super_admin_required
def update_config():
    """
    Update one or more platform config keys.

    Accepted body keys:
      house_edge_pct  float  1–70  Target platform margin %
      margin_strength float  0–1   Enforcement strength (0=off, 1=full)
    """
    user = _get_current_user()
    data = request.get_json(silent=True) or {}
    updated = {}

    if 'house_edge_pct' in data:
        val = float(data['house_edge_pct'])
        if not (1.0 <= val <= 70.0):
            return jsonify({'error': 'house_edge_pct must be between 1 and 70'}), 400
        PlatformConfig.set('house_edge_pct', val, updated_by_id=user.id)
        updated['house_edge_pct'] = val

    if 'margin_strength' in data:
        val = float(data['margin_strength'])
        if not (0.0 <= val <= 1.0):
            return jsonify({'error': 'margin_strength must be between 0 and 1'}), 400
        PlatformConfig.set('margin_strength', val, updated_by_id=user.id)
        updated['margin_strength'] = val

    if not updated:
        return jsonify({'error': 'No valid keys provided'}), 400

    return jsonify({'updated': updated, **PlatformConfig.all_as_dict()})
