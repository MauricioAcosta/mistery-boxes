import os
import hmac
import hashlib
from ..extensions import db
from ..models.opening import UserSeed


class ProvablyFairService:
    """
    Provably Fair algorithm implementation.

    Each opening is determined by:
        HMAC-SHA256(server_seed, "{client_seed}:{nonce}")

    The server_seed is committed in advance (only its SHA256 hash is shown to the
    user). After the opening the raw server_seed is revealed so the user can
    independently verify the result using any HMAC-SHA256 tool.
    """

    @staticmethod
    def generate_server_seed() -> str:
        return os.urandom(32).hex()

    @staticmethod
    def hash_seed(seed: str) -> str:
        return hashlib.sha256(seed.encode('utf-8')).hexdigest()

    @staticmethod
    def compute_result(server_seed: str, client_seed: str, nonce: int) -> float:
        """
        Returns a float in [0, 1) derived from the three inputs.

        Steps:
          1. message = "{client_seed}:{nonce}" (UTF-8 bytes)
          2. h = HMAC-SHA256(key=server_seed, msg=message)
          3. Take the first 8 hex characters → 32-bit integer
          4. Divide by (0xFFFFFFFF + 1) to get [0, 1)
        """
        message = f"{client_seed}:{nonce}".encode('utf-8')
        h = hmac.new(server_seed.encode('utf-8'), message, hashlib.sha256)
        int_result = int(h.hexdigest()[:8], 16)
        return int_result / (0xFFFFFFFF + 1)

    @staticmethod
    def create_seed_pair(user_id: int, client_seed: str = None) -> UserSeed:
        """Deactivate the current pair and generate a fresh one."""
        UserSeed.query.filter_by(user_id=user_id, is_active=True).update(
            {'is_active': False}
        )
        server_seed = ProvablyFairService.generate_server_seed()
        pair = UserSeed(
            user_id=user_id,
            server_seed=server_seed,
            server_seed_hash=ProvablyFairService.hash_seed(server_seed),
            client_seed=client_seed or os.urandom(16).hex(),
            nonce=0,
            is_active=True,
        )
        db.session.add(pair)
        db.session.flush()
        return pair

    @staticmethod
    def get_active_seed(user_id: int) -> UserSeed:
        return UserSeed.query.filter_by(user_id=user_id, is_active=True).first()

    @staticmethod
    def generate_result(seed_pair: UserSeed) -> tuple:
        """
        Consume one nonce and return (result_float, nonce_used).
        Auto-rotates after 1 000 uses.
        """
        current_nonce = seed_pair.nonce
        result = ProvablyFairService.compute_result(
            seed_pair.server_seed, seed_pair.client_seed, current_nonce
        )
        seed_pair.nonce += 1
        if seed_pair.nonce >= 1000:
            ProvablyFairService.create_seed_pair(seed_pair.user_id)
        return result, current_nonce

    @staticmethod
    def rotate_seed(user_id: int, new_client_seed: str = None) -> dict:
        """Manually rotate seeds. Returns the now-revealed old server_seed."""
        old = ProvablyFairService.get_active_seed(user_id)
        old_server_seed = old.server_seed if old else None
        new = ProvablyFairService.create_seed_pair(user_id, new_client_seed)
        db.session.flush()
        return {
            'old_server_seed': old_server_seed,
            'new_server_seed_hash': new.server_seed_hash,
            'new_client_seed': new.client_seed,
        }
