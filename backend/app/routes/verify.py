from flask import Blueprint, request, jsonify
from ..services.provably_fair import ProvablyFairService
from ..services.probability_engine import ProbabilityEngine
from ..models import Box

bp = Blueprint('verify', __name__, url_prefix='/api')


@bp.route('/verify', methods=['POST'])
def verify():
    """
    Public endpoint — anyone can verify a past opening.
    Accepts: server_seed, client_seed, nonce, box_id
    Returns: recomputed result + the item it maps to.
    """
    data = request.get_json(silent=True) or {}
    required = ['server_seed', 'client_seed', 'nonce', 'box_id']
    missing = [k for k in required if k not in data]
    if missing:
        return jsonify({'error': f'Missing fields: {missing}'}), 400

    server_seed = data['server_seed']
    client_seed = data['client_seed']
    nonce = int(data['nonce'])
    box_id = int(data['box_id'])

    result_float = ProvablyFairService.compute_result(server_seed, client_seed, nonce)
    computed_hash = ProvablyFairService.hash_seed(server_seed)

    box = Box.query.filter_by(id=box_id, is_active=True).first_or_404()
    items = box.items.filter_by(is_active=True).all()
    total_weight = sum(i.weight for i in items)
    winner = ProbabilityEngine.select_item(items, result_float)

    return jsonify({
        'valid': True,
        'server_seed_hash': computed_hash,
        'result_float': result_float,
        'result_percentage': round(result_float * 100, 6),
        'winning_item': winner.product.to_dict() if winner else None,
        'winning_probability_pct': round(winner.weight / total_weight * 100, 4) if winner else None,
    })
