"""Integration tests for /api/verify (public provably-fair endpoint)."""
import pytest
from app.services.provably_fair import ProvablyFairService
from tests.conftest import auth_header


def _do_open(client, box_id, token):
    rv = client.post(f'/api/boxes/{box_id}/open', headers=auth_header(token))
    assert rv.status_code == 200
    return rv.get_json()


class TestVerify:
    URL = '/api/verify'

    def test_verify_valid_opening(self, client, db, funded_user, funded_token, box):
        """The verification endpoint must reproduce the same result float."""
        opening_data = _do_open(client, box.id, funded_token)
        proof = opening_data['proof']

        rv = client.post(self.URL, json={
            'server_seed': proof['server_seed'],
            'client_seed': proof['client_seed'],
            'nonce':       proof['nonce'],
            'box_id':      box.id,
        })
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['result_float'] == pytest.approx(proof['result_float'], rel=1e-9)
        assert 'winning_item' in data
        assert 'server_seed_hash' in data

    def test_verify_hash_matches(self, client, db, funded_user, funded_token, box):
        """server_seed_hash returned by verify must match SHA-256 of the seed."""
        opening_data = _do_open(client, box.id, funded_token)
        proof = opening_data['proof']

        rv = client.post(self.URL, json={
            'server_seed': proof['server_seed'],
            'client_seed': proof['client_seed'],
            'nonce':       proof['nonce'],
            'box_id':      box.id,
        })
        data = rv.get_json()
        expected_hash = ProvablyFairService.hash_seed(proof['server_seed'])
        assert data['server_seed_hash'] == expected_hash

    def test_verify_wrong_server_seed(self, client, db, funded_user, funded_token, box):
        """Tampered server seed should not reproduce the original result."""
        opening_data = _do_open(client, box.id, funded_token)
        proof = opening_data['proof']

        rv = client.post(self.URL, json={
            'server_seed': 'a' * 64,   # wrong seed
            'client_seed': proof['client_seed'],
            'nonce':       proof['nonce'],
            'box_id':      box.id,
        })
        # Either returns 200 with a different float, or a validation error
        if rv.status_code == 200:
            assert rv.get_json()['result_float'] != pytest.approx(proof['result_float'])

    def test_verify_invalid_box_id(self, client, db, funded_user, funded_token, box):
        opening_data = _do_open(client, box.id, funded_token)
        proof = opening_data['proof']

        rv = client.post(self.URL, json={
            'server_seed': proof['server_seed'],
            'client_seed': proof['client_seed'],
            'nonce':       proof['nonce'],
            'box_id':      999999,
        })
        assert rv.status_code == 404

    def test_verify_missing_fields(self, client, db):
        rv = client.post(self.URL, json={'server_seed': 'abc'})
        assert rv.status_code == 400

    def test_verify_is_public(self, client, db, funded_user, funded_token, box):
        """No auth required — anyone can verify."""
        opening_data = _do_open(client, box.id, funded_token)
        proof = opening_data['proof']

        rv = client.post(self.URL, json={
            'server_seed': proof['server_seed'],
            'client_seed': proof['client_seed'],
            'nonce':       proof['nonce'],
            'box_id':      box.id,
        })
        # Must work without Authorization header
        assert rv.status_code == 200


class TestProvablyFairService:
    """Unit tests for the core HMAC-SHA256 algorithm — no HTTP involved."""

    def test_compute_result_deterministic(self):
        r1 = ProvablyFairService.compute_result('seed_a', 'client_b', 0)
        r2 = ProvablyFairService.compute_result('seed_a', 'client_b', 0)
        assert r1 == r2

    def test_compute_result_range(self):
        for nonce in range(20):
            r = ProvablyFairService.compute_result('server_seed_xyz', 'client_seed_abc', nonce)
            assert 0.0 <= r < 1.0, f"result {r} is out of [0, 1) at nonce={nonce}"

    def test_different_nonce_gives_different_result(self):
        r0 = ProvablyFairService.compute_result('server', 'client', 0)
        r1 = ProvablyFairService.compute_result('server', 'client', 1)
        assert r0 != r1

    def test_hash_seed_is_sha256_hex(self):
        import hashlib
        seed = 'some_server_seed'
        expected = hashlib.sha256(seed.encode('utf-8')).hexdigest()
        assert ProvablyFairService.hash_seed(seed) == expected
        assert len(ProvablyFairService.hash_seed(seed)) == 64

    def test_generate_server_seed_is_hex_64(self, app):
        with app.app_context():
            seed = ProvablyFairService.generate_server_seed()
            assert len(seed) == 64
            int(seed, 16)   # raises ValueError if not valid hex
