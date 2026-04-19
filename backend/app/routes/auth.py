from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from ..extensions import db
from ..models import User, Wallet
from ..services.provably_fair import ProvablyFairService

bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    required = ['username', 'email', 'password']
    if not all(k in data for k in required):
        return jsonify({'error': 'username, email and password are required'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already taken'}), 409
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409
    if len(data['password']) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    user = User(username=data['username'], email=data['email'])
    user.set_password(data['password'])
    wallet = Wallet(user=user)
    db.session.add(user)
    db.session.add(wallet)
    db.session.flush()

    ProvablyFairService.create_seed_pair(user.id, data.get('client_seed'))
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict(), 'wallet': wallet.to_dict()}), 201


@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    if not all(k in data for k in ['email', 'password']):
        return jsonify({'error': 'email and password are required'}), 400

    user = User.query.filter_by(email=data['email']).first()
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    if not user.is_active:
        return jsonify({'error': 'Account is disabled'}), 403

    token = create_access_token(identity=str(user.id))
    return jsonify({
        'token': token,
        'user': user.to_dict(),
        'wallet': user.wallet.to_dict() if user.wallet else None,
    })


@bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user = User.query.get_or_404(int(get_jwt_identity()))
    seed = ProvablyFairService.get_active_seed(user.id)
    return jsonify({
        'user': user.to_dict(),
        'wallet': user.wallet.to_dict() if user.wallet else None,
        'active_seed': seed.to_dict() if seed else None,
    })


@bp.route('/seed/rotate', methods=['POST'])
@jwt_required()
def rotate_seed():
    """Let the user rotate their seed pair at will."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    result = ProvablyFairService.rotate_seed(user_id, data.get('new_client_seed'))
    db.session.commit()
    return jsonify(result)
