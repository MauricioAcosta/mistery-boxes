from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Box, BoxOpening
from ..services.probability_engine import ProbabilityEngine
from ..services.provably_fair import ProvablyFairService
from ..services.wallet_service import WalletService

bp = Blueprint('boxes', __name__, url_prefix='/api')


@bp.route('/boxes', methods=['GET'])
def list_boxes():
    category = request.args.get('category')
    query = Box.query.filter_by(is_active=True)
    if category:
        query = query.filter_by(category=category)
    boxes = query.order_by(Box.price.asc()).all()
    return jsonify([b.to_dict() for b in boxes])


@bp.route('/boxes/<int:box_id>', methods=['GET'])
def get_box(box_id):
    box = Box.query.filter_by(id=box_id, is_active=True).first_or_404()
    return jsonify(box.to_dict(include_items=True))


@bp.route('/boxes/<int:box_id>/open', methods=['POST'])
@jwt_required()
def open_box(box_id):
    user_id = int(get_jwt_identity())
    box = Box.query.filter_by(id=box_id, is_active=True).first_or_404()
    data = request.get_json() or {}

    wallet = WalletService.get_wallet(user_id)
    if not wallet or float(wallet.balance) < float(box.price):
        return jsonify({'error': 'Insufficient balance'}), 402

    seed_pair = ProvablyFairService.get_active_seed(user_id)
    if not seed_pair:
        seed_pair = ProvablyFairService.create_seed_pair(user_id)

    # Allow user to override client seed before rolling
    if data.get('client_seed') and data['client_seed'] != seed_pair.client_seed:
        seed_pair.client_seed = data['client_seed']
        db.session.flush()

    result_float, nonce = ProvablyFairService.generate_result(seed_pair)

    items = box.items.filter_by(is_active=True).all()
    if not items:
        return jsonify({'error': 'Box has no items configured'}), 500

    winner = ProbabilityEngine.select_item(items, result_float)

    WalletService.debit(
        user_id=user_id,
        amount=float(box.price),
        description=f'Opened: {box.name}',
        reference_type='box_open',
    )

    opening = BoxOpening(
        user_id=user_id,
        box_id=box.id,
        box_item_id=winner.id,
        server_seed=seed_pair.server_seed,
        server_seed_hash=seed_pair.server_seed_hash,
        client_seed=seed_pair.client_seed,
        nonce=nonce,
        result_float=result_float,
        amount_paid=box.price,
        status='pending',
    )
    db.session.add(opening)
    box.total_openings += 1
    db.session.commit()

    active_seed = ProvablyFairService.get_active_seed(user_id)

    return jsonify({
        'opening_id': opening.id,
        'won': winner.product.to_dict(),
        'proof': {
            'server_seed': seed_pair.server_seed,
            'server_seed_hash': seed_pair.server_seed_hash,
            'client_seed': seed_pair.client_seed,
            'nonce': nonce,
            'result_float': result_float,
        },
        'wallet_balance': float(WalletService.get_wallet(user_id).balance),
        'next_seed_hash': active_seed.server_seed_hash if active_seed else None,
    })


@bp.route('/openings', methods=['GET'])
@jwt_required()
def get_openings():
    user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 50)

    paginated = (
        BoxOpening.query
        .filter_by(user_id=user_id)
        .order_by(BoxOpening.created_at.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    return jsonify({
        'openings': [o.to_dict() for o in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'current_page': page,
    })
