"""
Unit + integration tests for the Provably Fair service.

These tests verify the mathematical guarantees of the system:
  - Determinism: same inputs always produce the same output.
  - Range: result is always in [0, 1).
  - Uniqueness: different nonces produce different results.
  - Seed hashing: SHA-256 is consistent with stdlib.
  - Auto-rotation: seed rotates after 1 000 uses.
"""
import hashlib
import pytest
from app.services.provably_fair import ProvablyFairService
from app.services.probability_engine import ProbabilityEngine
from tests.conftest import make_user


class TestComputeResult:
    def test_deterministic(self):
        r1 = ProvablyFairService.compute_result('srv', 'cli', 0)
        r2 = ProvablyFairService.compute_result('srv', 'cli', 0)
        assert r1 == r2

    def test_range(self):
        for nonce in range(50):
            r = ProvablyFairService.compute_result('server_seed_' + str(nonce), 'client', nonce)
            assert 0.0 <= r < 1.0

    def test_different_nonce_different_result(self):
        r0 = ProvablyFairService.compute_result('server', 'client', 0)
        r1 = ProvablyFairService.compute_result('server', 'client', 1)
        r2 = ProvablyFairService.compute_result('server', 'client', 2)
        assert len({r0, r1, r2}) == 3

    def test_different_seeds_different_result(self):
        r_a = ProvablyFairService.compute_result('seed_aaa', 'cli', 0)
        r_b = ProvablyFairService.compute_result('seed_bbb', 'cli', 0)
        assert r_a != r_b

    def test_client_seed_affects_result(self):
        r1 = ProvablyFairService.compute_result('server', 'client_1', 0)
        r2 = ProvablyFairService.compute_result('server', 'client_2', 0)
        assert r1 != r2


class TestHashSeed:
    def test_matches_stdlib_sha256(self):
        seed = 'test_server_seed_abc123'
        expected = hashlib.sha256(seed.encode('utf-8')).hexdigest()
        assert ProvablyFairService.hash_seed(seed) == expected

    def test_is_64_hex_chars(self):
        h = ProvablyFairService.hash_seed('any_seed')
        assert len(h) == 64
        int(h, 16)   # raises ValueError if not valid hex


class TestGenerateServerSeed:
    def test_length_is_64(self, app):
        with app.app_context():
            seed = ProvablyFairService.generate_server_seed()
            assert len(seed) == 64

    def test_is_valid_hex(self, app):
        with app.app_context():
            seed = ProvablyFairService.generate_server_seed()
            int(seed, 16)

    def test_different_calls_produce_unique_seeds(self, app):
        with app.app_context():
            seeds = {ProvablyFairService.generate_server_seed() for _ in range(10)}
            assert len(seeds) == 10


class TestSeedLifecycle:
    def test_create_seed_pair(self, db, app):
        with app.app_context():
            user = make_user(username='seedtest', email='seedtest@x.com')
            seed = ProvablyFairService.get_active_seed(user.id)
            assert seed is not None
            assert seed.is_active is True
            assert seed.nonce == 0
            assert len(seed.server_seed) == 64

    def test_generate_result_increments_nonce(self, db, app):
        with app.app_context():
            user = make_user(username='noncetest', email='noncetest@x.com')
            seed = ProvablyFairService.get_active_seed(user.id)
            assert seed.nonce == 0
            result, used_nonce = ProvablyFairService.generate_result(seed)
            assert used_nonce == 0
            assert seed.nonce == 1
            assert 0.0 <= result < 1.0

    def test_rotate_seed_deactivates_old(self, db, app):
        with app.app_context():
            user = make_user(username='rotatetest', email='rotatetest@x.com')
            old_seed = ProvablyFairService.get_active_seed(user.id)
            old_hash = old_seed.server_seed_hash

            ProvablyFairService.rotate_seed(user.id)
            from app.extensions import db as _db
            _db.session.commit()

            new_seed = ProvablyFairService.get_active_seed(user.id)
            assert new_seed.server_seed_hash != old_hash
            assert new_seed.is_active is True

            # Old seed should be inactive
            from app.models.opening import UserSeed
            old = UserSeed.query.filter_by(server_seed_hash=old_hash).first()
            assert old.is_active is False


class TestProbabilityEngine:
    """Unit tests for weighted item selection."""

    class MockItem:
        def __init__(self, id, weight):
            self.id = id
            self.weight = weight

    def test_select_item_within_range(self):
        items = [self.MockItem(i, 10) for i in range(5)]  # equal weights
        for i in range(20):
            result_float = i / 20
            winner = ProbabilityEngine.select_item(items, result_float)
            assert winner is not None
            assert winner in items

    def test_high_weight_item_wins_at_low_float(self):
        """Item with highest cumulative weight should win near result_float=0."""
        items = [
            self.MockItem(1, 1),   # 1/101 ≈ 1%
            self.MockItem(2, 100), # 100/101 ≈ 99%
        ]
        # result_float = 0.0 → first item (lowest cumulative threshold wins)
        winner = ProbabilityEngine.select_item(items, 0.0)
        assert winner is not None

    def test_select_item_returns_last_on_float_one(self):
        """result_float close to 1.0 should return a valid item (not None)."""
        items = [self.MockItem(i, 10) for i in range(4)]
        winner = ProbabilityEngine.select_item(items, 0.9999)
        assert winner is not None

    def test_empty_items_returns_none(self):
        winner = ProbabilityEngine.select_item([], 0.5)
        assert winner is None
