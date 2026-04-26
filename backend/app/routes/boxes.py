from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import subqueryload
from ..extensions import db
from ..models import Box, BoxOpening, PlatformConfig
from ..models.box import BoxItem
from ..services.probability_engine import ProbabilityEngine
from ..services.provably_fair import ProvablyFairService
from ..services.wallet_service import WalletService

bp = Blueprint('boxes', __name__, url_prefix='/api')


@bp.route('/boxes', methods=['GET'])
def list_boxes():
    category  = request.args.get('category')
    client_id = request.args.get('client_id')
    query = Box.query.filter_by(is_active=True)
    if category:
        query = query.filter_by(category=category)
    if client_id and client_id != 'default':
        query = query.filter(Box.client_id.in_([client_id, 'default']))
    # Eager-load items + products in 2 extra queries instead of N×2
    boxes = query.options(
        subqueryload(Box.items).subqueryload(BoxItem.product)
    ).order_by(Box.price.asc()).all()
    return jsonify([b.to_dict() for b in boxes])


@bp.route('/boxes/<int:box_id>', methods=['GET'])
def get_box(box_id):
    box = (Box.query
           .filter_by(id=box_id, is_active=True)
           .options(subqueryload(Box.items).subqueryload(BoxItem.product))
           .first_or_404())
    return jsonify(box.to_dict(include_items=True))


@bp.route('/boxes/<int:box_id>/open', methods=['POST'])
@jwt_required()
def open_box(box_id):
    user_id = int(get_jwt_identity())
    box = Box.query.filter_by(id=box_id, is_active=True).first_or_404()
    data = request.get_json(silent=True) or {}

    payment = data.get('payment_method', 'usd')   # 'usd' | 'coins'
    wallet = WalletService.get_wallet(user_id)
    if not wallet:
        return jsonify({'error': 'Billetera no encontrada'}), 404

    if payment == 'coins':
        if not box.price_coins:
            return jsonify({'error': 'Esta caja no acepta monedas'}), 400
        if (wallet.coins or 0) < box.price_coins:
            return jsonify({'error': 'Monedas insuficientes'}), 402
    else:
        if float(wallet.balance) < float(box.price):
            return jsonify({'error': 'Saldo insuficiente'}), 402

    seed_pair = ProvablyFairService.get_active_seed(user_id)
    if not seed_pair:
        seed_pair = ProvablyFairService.create_seed_pair(user_id)

    # Allow user to override client seed before rolling
    if data.get('client_seed') and data['client_seed'] != seed_pair.client_seed:
        seed_pair.client_seed = data['client_seed']
        db.session.flush()

    result_float, nonce = ProvablyFairService.generate_result(seed_pair)

    items = [i for i in box.items if i.is_active]
    if not items:
        return jsonify({'error': 'La caja no tiene ítems configurados'}), 500

    # Load platform margin config and apply house-edge enforcement
    house_edge_pct  = PlatformConfig.get('house_edge_pct',  cast=float) or 30.0
    margin_strength = PlatformConfig.get('margin_strength', cast=float) or 1.0

    winner = ProbabilityEngine.select_item_with_margin(
        items       = items,
        result_float= result_float,
        box_price   = float(box.price),
        house_edge_pct  = house_edge_pct,
        margin_strength = margin_strength,
    )

    if payment == 'coins':
        WalletService.debit_coins(
            user_id=user_id, coins=box.price_coins,
            description=f'Opened: {box.name}',
        )
        amount_paid = 0.0
    else:
        WalletService.debit(
            user_id=user_id,
            amount=float(box.price),
            description=f'Opened: {box.name}',
            reference_type='box_open',
        )
        amount_paid = box.price

    opening = BoxOpening(
        user_id=user_id,
        box_id=box.id,
        box_item_id=winner.id,
        server_seed=seed_pair.server_seed,
        server_seed_hash=seed_pair.server_seed_hash,
        client_seed=seed_pair.client_seed,
        nonce=nonce,
        result_float=result_float,
        amount_paid=amount_paid,
        status='pending',
    )
    db.session.add(opening)
    box.total_openings += 1
    db.session.commit()

    active_seed = ProvablyFairService.get_active_seed(user_id)

    return jsonify({
        'opening_id': opening.id,
        'won': winner.product.to_dict(),
        'winner_box_item_id': winner.id,
        'proof': {
            'server_seed': seed_pair.server_seed,
            'server_seed_hash': seed_pair.server_seed_hash,
            'client_seed': seed_pair.client_seed,
            'nonce': nonce,
            'result_float': result_float,
        },
        'wallet_balance': float(WalletService.get_wallet(user_id).balance),
        'wallet_coins': WalletService.get_wallet(user_id).coins or 0,
        'payment_method': payment,
        'next_seed_hash': active_seed.server_seed_hash if active_seed else None,
    })


@bp.route('/openings', methods=['GET'])
@jwt_required()
def get_openings():
    user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 50)

    status_filter = request.args.get('status', '').strip()
    query = BoxOpening.query.filter_by(user_id=user_id)
    if status_filter in ('pending', 'exchanged', 'shipped', 'sold'):
        query = query.filter_by(status=status_filter)

    paginated = (
        query
        .order_by(BoxOpening.created_at.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    return jsonify({
        'openings': [o.to_dict() for o in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'current_page': page,
    })
