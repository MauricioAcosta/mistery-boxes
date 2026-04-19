"""Integration tests for /api/wallet endpoints."""
import pytest
from tests.conftest import auth_header


class TestGetWallet:
    URL = '/api/wallet'

    def test_get_wallet_authenticated(self, client, db, user, user_token):
        rv = client.get(self.URL, headers=auth_header(user_token))
        assert rv.status_code == 200
        data = rv.get_json()
        assert 'wallet' in data
        assert 'transactions' in data
        assert float(data['wallet']['balance']) == 0.0

    def test_get_wallet_requires_auth(self, client, db):
        rv = client.get(self.URL)
        assert rv.status_code == 401


class TestDeposit:
    URL = '/api/wallet/deposit'

    def test_deposit_success(self, client, db, user, user_token):
        rv = client.post(self.URL, json={'amount': 50.00}, headers=auth_header(user_token))
        assert rv.status_code == 200
        data = rv.get_json()
        assert float(data['wallet']['balance']) == pytest.approx(50.00)

    def test_deposit_multiple_times_accumulates(self, client, db, user, user_token):
        client.post(self.URL, json={'amount': 25.00}, headers=auth_header(user_token))
        client.post(self.URL, json={'amount': 25.00}, headers=auth_header(user_token))
        rv = client.get('/api/wallet', headers=auth_header(user_token))
        assert float(rv.get_json()['wallet']['balance']) == pytest.approx(50.00)

    def test_deposit_creates_transaction(self, client, db, user, user_token):
        client.post(self.URL, json={'amount': 10.00}, headers=auth_header(user_token))
        rv = client.get('/api/wallet', headers=auth_header(user_token))
        txns = rv.get_json()['transactions']
        assert len(txns) == 1
        assert txns[0]['type'] == 'deposit'
        assert float(txns[0]['amount']) == pytest.approx(10.00)

    def test_deposit_missing_amount(self, client, db, user, user_token):
        rv = client.post(self.URL, json={}, headers=auth_header(user_token))
        assert rv.status_code == 400

    def test_deposit_zero_is_invalid(self, client, db, user, user_token):
        rv = client.post(self.URL, json={'amount': 0}, headers=auth_header(user_token))
        assert rv.status_code == 400

    def test_deposit_negative_is_invalid(self, client, db, user, user_token):
        rv = client.post(self.URL, json={'amount': -10}, headers=auth_header(user_token))
        assert rv.status_code == 400

    def test_deposit_over_max_is_invalid(self, client, db, user, user_token):
        rv = client.post(self.URL, json={'amount': 1001}, headers=auth_header(user_token))
        assert rv.status_code == 400

    def test_deposit_non_numeric_is_invalid(self, client, db, user, user_token):
        rv = client.post(self.URL, json={'amount': 'abc'}, headers=auth_header(user_token))
        assert rv.status_code == 400

    def test_deposit_requires_auth(self, client, db):
        rv = client.post(self.URL, json={'amount': 10})
        assert rv.status_code == 401

    def test_deposit_balance_after_is_accurate(self, client, db, user, user_token):
        client.post(self.URL, json={'amount': 50.00}, headers=auth_header(user_token))
        rv = client.get('/api/wallet', headers=auth_header(user_token))
        txn = rv.get_json()['transactions'][0]
        assert float(txn['balance_after']) == pytest.approx(50.00)
