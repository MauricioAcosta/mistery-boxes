import secrets
import resend
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
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


@bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': 'email es requerido'}), 400

    user = User.query.filter_by(email=email).first()
    # Always return 200 to avoid user enumeration
    if not user:
        return jsonify({'message': 'Si el correo existe, recibirás un enlace.'}), 200

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.session.commit()

    reset_url = f"{current_app.config['FRONTEND_URL']}/reset-password?token={token}"
    try:
        resend.api_key = current_app.config['RESEND_API_KEY']
        resend.Emails.send({
            'from': current_app.config['MAIL_FROM'],
            'to': [user.email],
            'subject': 'Restablece tu contraseña — Mystery Boxes',
            'html': f"""
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:12px">
  <h2 style="color:#f59e0b;margin-bottom:8px">🎁 Mystery Boxes</h2>
  <p>Hola <strong>{user.username}</strong>,</p>
  <p>Recibimos una solicitud para restablecer tu contraseña.
     El enlace es válido por <strong>1 hora</strong>.</p>
  <a href="{reset_url}"
     style="display:inline-block;margin:24px 0;padding:14px 32px;
            background:#f59e0b;color:#000;border-radius:8px;
            text-decoration:none;font-weight:bold;font-size:16px">
    Restablecer contraseña
  </a>
  <p style="color:#94a3b8;font-size:13px;margin-top:16px">
    Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.
  </p>
</div>""",
        })
    except Exception as e:
        current_app.logger.error(f'Resend error: {e}')
        return jsonify({'error': 'No se pudo enviar el correo. Intenta más tarde.'}), 500

    return jsonify({'message': 'Si el correo existe, recibirás un enlace.'}), 200


@bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json(silent=True) or {}
    token = (data.get('token') or '').strip()
    new_password = data.get('password', '')

    if not token or not new_password:
        return jsonify({'error': 'token y password son requeridos'}), 400
    if len(new_password) < 8:
        return jsonify({'error': 'La contraseña debe tener al menos 8 caracteres'}), 400

    user = User.query.filter_by(reset_token=token).first()
    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        return jsonify({'error': 'El enlace no es válido o ha expirado'}), 400

    user.set_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.session.commit()

    return jsonify({'message': 'Contraseña actualizada correctamente'}), 200


@bp.route('/seed/rotate', methods=['POST'])
@jwt_required()
def rotate_seed():
    """Let the user rotate their seed pair at will."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    result = ProvablyFairService.rotate_seed(user_id, data.get('new_client_seed'))
    db.session.commit()
    return jsonify(result)
