from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import BoxOpening
from ..services.wallet_service import WalletService

bp = Blueprint('exchange', __name__, url_prefix='/api')

EXCHANGE_COMMISSION = 0.10  # 10 % house commission on exchange


@bp.route('/exchange', methods=['POST'])
@jwt_required()
def exchange_prize():
    """Convert a pending prize into wallet credits (minus commission)."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    if 'opening_id' not in data:
        return jsonify({'error': 'opening_id is required'}), 400

    opening = BoxOpening.query.filter_by(
        id=data['opening_id'], user_id=user_id, status='pending'
    ).first()
    if not opening:
        return jsonify({'error': 'Opening not found or already processed'}), 404

    product = opening.box_item.product
    retail_value = float(product.retail_value)
    exchange_amount = round(retail_value * (1 - EXCHANGE_COMMISSION), 2)

    WalletService.credit(
        user_id=user_id,
        amount=exchange_amount,
        description=f'Exchanged {product.name} (${retail_value:.2f} − {int(EXCHANGE_COMMISSION * 100)}% fee)',
        reference_type='exchange',
        reference_id=opening.id,
    )

    opening.status = 'exchanged'
    opening.exchange_amount = exchange_amount
    db.session.commit()

    return jsonify({
        'message': 'Exchange successful',
        'product': product.to_dict(),
        'product_value': retail_value,
        'commission_pct': int(EXCHANGE_COMMISSION * 100),
        'exchange_amount': exchange_amount,
        'wallet_balance': float(WalletService.get_wallet(user_id).balance),
    })


@bp.route('/ship', methods=['POST'])
@jwt_required()
def request_shipment():
    """Request physical shipment (dropshipping trigger in production)."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    required_fields = ['opening_id', 'full_name', 'address', 'city', 'country', 'postal_code']
    missing = [f for f in required_fields if f not in data]
    if missing:
        return jsonify({'error': f'Missing fields: {missing}'}), 400

    opening = BoxOpening.query.filter_by(
        id=data['opening_id'], user_id=user_id, status='pending'
    ).first()
    if not opening:
        return jsonify({'error': 'Opening not found or already processed'}), 404

    opening.status = 'shipped'
    # TODO: call dropshipping provider API here
    db.session.commit()

    return jsonify({
        'message': 'Shipment requested. We will contact you with tracking details within 24 h.',
        'opening_id': opening.id,
        'product': opening.box_item.product.to_dict(),
    })
