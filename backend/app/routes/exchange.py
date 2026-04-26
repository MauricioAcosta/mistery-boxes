from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import BoxOpening
from ..services.wallet_service import WalletService

bp = Blueprint('exchange', __name__, url_prefix='/api')

EXCHANGE_RATE = 0.70   # 70 % of retail → wallet credit
SHIPPING_COST = 5.00   # flat shipping fee in USD


@bp.route('/exchange', methods=['POST'])
@jwt_required()
def exchange_prize():
    """Option 3 — Convert prize to wallet credits at 70 % of retail value."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    if 'opening_id' not in data:
        return jsonify({'error': 'El identificador de la apertura es obligatorio'}), 400

    opening = BoxOpening.query.filter_by(
        id=data['opening_id'], user_id=user_id, status='pending'
    ).first()
    if not opening:
        return jsonify({'error': 'Apertura no encontrada o ya procesada'}), 404

    product = opening.box_item.product
    retail_value = float(product.retail_value)
    exchange_amount = round(retail_value * EXCHANGE_RATE, 2)

    WalletService.credit(
        user_id=user_id,
        amount=exchange_amount,
        description=f'Canje {product.name} (${retail_value:.2f} × {int(EXCHANGE_RATE*100)}%)',
        reference_type='exchange',
        reference_id=opening.id,
    )

    opening.status = 'exchanged'
    opening.exchange_amount = exchange_amount
    db.session.commit()

    return jsonify({
        'message': 'Canje realizado con éxito',
        'product': product.to_dict(),
        'product_value': retail_value,
        'rate_pct': int(EXCHANGE_RATE * 100),
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
        _labels = {
            'opening_id': 'ID de apertura', 'full_name': 'nombre completo',
            'address': 'dirección', 'city': 'ciudad',
            'country': 'país', 'postal_code': 'código postal',
        }
        missing_labels = [_labels.get(f, f) for f in missing]
        return jsonify({'error': f'Faltan los siguientes datos de envío: {", ".join(missing_labels)}'}), 400

    opening = BoxOpening.query.filter_by(
        id=data['opening_id'], user_id=user_id, status='pending'
    ).first()
    if not opening:
        return jsonify({'error': 'Apertura no encontrada o ya procesada'}), 404

    # Charge shipping cost if user has balance
    wallet = WalletService.get_wallet(user_id)
    if float(wallet.balance) < SHIPPING_COST:
        return jsonify({
            'error': f'Se requieren ${SHIPPING_COST:.2f} para cubrir el costo de envío',
            'shipping_cost': SHIPPING_COST,
        }), 402

    WalletService.debit(
        user_id=user_id,
        amount=SHIPPING_COST,
        description=f'Costo de envío — {opening.box_item.product.name}',
        reference_type='shipping',
        reference_id=opening.id,
    )

    opening.status = 'shipped'
    db.session.commit()

    return jsonify({
        'message': 'Envío solicitado. Te contactaremos con el seguimiento en 24 h.',
        'opening_id': opening.id,
        'product': opening.box_item.product.to_dict(),
        'shipping_cost': SHIPPING_COST,
        'wallet_balance': float(WalletService.get_wallet(user_id).balance),
    })
