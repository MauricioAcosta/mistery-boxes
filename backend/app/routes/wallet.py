from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..services.wallet_service import WalletService
from ..extensions import db

bp = Blueprint('wallet', __name__, url_prefix='/api/wallet')


@bp.route('', methods=['GET'])
@jwt_required()
def get_wallet():
    user_id = int(get_jwt_identity())
    wallet = WalletService.get_wallet(user_id)
    if not wallet:
        return jsonify({'error': 'Wallet not found'}), 404
    transactions = wallet.transactions.limit(50).all()
    return jsonify({
        'wallet': wallet.to_dict(),
        'transactions': [t.to_dict() for t in transactions],
    })


@bp.route('/deposit', methods=['POST'])
@jwt_required()
def deposit():
    """Simulated deposit — wire up a real payment gateway in production."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    amount = data.get('amount')

    if amount is None:
        return jsonify({'error': 'amount is required'}), 400
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return jsonify({'error': 'amount must be a number'}), 400
    if not (1 <= amount <= 1000):
        return jsonify({'error': 'amount must be between 1 and 1000'}), 400

    wallet = WalletService.deposit(user_id, amount, description='Simulated deposit')
    db.session.commit()
    return jsonify({'message': 'Deposit successful', 'wallet': wallet.to_dict()})


@bp.route('/buy-coins', methods=['POST'])
@jwt_required()
def buy_coins():
    """Exchange USD balance for in-game coins."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    amount = data.get('usd_amount')

    if amount is None:
        return jsonify({'error': 'usd_amount is required'}), 400
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return jsonify({'error': 'usd_amount must be a number'}), 400
    if not (1 <= amount <= 500):
        return jsonify({'error': 'usd_amount must be between 1 and 500'}), 400

    try:
        wallet = WalletService.buy_coins(user_id, amount)
        db.session.commit()
        coins_added = int(amount * WalletService.COINS_PER_USD)
        return jsonify({
            'message': f'Compraste {coins_added} coins',
            'coins_added': coins_added,
            'wallet': wallet.to_dict(),
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
