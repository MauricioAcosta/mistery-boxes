"""Integration tests for /api/exchange and /api/ship endpoints."""
import pytest
from tests.conftest import auth_header


def _open_box(client, box_id, token):
    """Helper: open a box and return the opening_id."""
    rv = client.post(f'/api/boxes/{box_id}/open', headers=auth_header(token))
    assert rv.status_code == 200, rv.get_json()
    return rv.get_json()['opening_id']


class TestExchange:
    URL = '/api/exchange'

    def test_exchange_success(self, client, db, funded_user, funded_token, box):
        opening_id = _open_box(client, box.id, funded_token)
        rv = client.post(self.URL, json={'opening_id': opening_id},
                         headers=auth_header(funded_token))
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['exchange_amount'] > 0
        assert data['commission_pct'] == 10
        # exchange_amount = retail_value * 0.9
        assert data['exchange_amount'] == pytest.approx(data['product_value'] * 0.9, abs=0.01)

    def test_exchange_credits_wallet(self, client, db, funded_user, funded_token, box):
        balance_before = float(funded_user.wallet.balance) - float(box.price)
        opening_id = _open_box(client, box.id, funded_token)
        rv = client.post(self.URL, json={'opening_id': opening_id},
                         headers=auth_header(funded_token))
        credit = rv.get_json()['exchange_amount']
        assert float(rv.get_json()['wallet_balance']) == pytest.approx(balance_before + credit, abs=0.01)

    def test_exchange_marks_opening_exchanged(self, client, db, funded_user, funded_token, box):
        opening_id = _open_box(client, box.id, funded_token)
        client.post(self.URL, json={'opening_id': opening_id},
                    headers=auth_header(funded_token))
        rv = client.get('/api/openings', headers=auth_header(funded_token))
        opening = next(o for o in rv.get_json()['openings'] if o['id'] == opening_id)
        assert opening['status'] == 'exchanged'
        assert opening['exchange_amount'] > 0

    def test_exchange_double_exchange_fails(self, client, db, funded_user, funded_token, box):
        opening_id = _open_box(client, box.id, funded_token)
        client.post(self.URL, json={'opening_id': opening_id}, headers=auth_header(funded_token))
        # Second exchange attempt on the same opening
        rv = client.post(self.URL, json={'opening_id': opening_id}, headers=auth_header(funded_token))
        assert rv.status_code == 404

    def test_exchange_wrong_user(self, client, db, funded_user, funded_token, user, user_token, box):
        opening_id = _open_box(client, box.id, funded_token)
        # Another user tries to exchange funded_user's opening
        rv = client.post(self.URL, json={'opening_id': opening_id},
                         headers=auth_header(user_token))
        assert rv.status_code == 404

    def test_exchange_missing_opening_id(self, client, db, funded_token):
        rv = client.post(self.URL, json={}, headers=auth_header(funded_token))
        assert rv.status_code == 400

    def test_exchange_requires_auth(self, client, db):
        rv = client.post(self.URL, json={'opening_id': 1})
        assert rv.status_code == 401


class TestShip:
    URL = '/api/ship'

    ADDR = {
        'full_name': 'Juan Pérez',
        'address': 'Calle 123',
        'city': 'Bogotá',
        'country': 'Colombia',
        'postal_code': '110111',
    }

    def test_ship_success(self, client, db, funded_user, funded_token, box):
        opening_id = _open_box(client, box.id, funded_token)
        rv = client.post(self.URL,
                         json={'opening_id': opening_id, **self.ADDR},
                         headers=auth_header(funded_token))
        assert rv.status_code == 200
        assert 'opening_id' in rv.get_json()

    def test_ship_marks_opening_shipped(self, client, db, funded_user, funded_token, box):
        opening_id = _open_box(client, box.id, funded_token)
        client.post(self.URL, json={'opening_id': opening_id, **self.ADDR},
                    headers=auth_header(funded_token))
        rv = client.get('/api/openings', headers=auth_header(funded_token))
        opening = next(o for o in rv.get_json()['openings'] if o['id'] == opening_id)
        assert opening['status'] == 'shipped'

    def test_ship_missing_address_field(self, client, db, funded_user, funded_token, box):
        opening_id = _open_box(client, box.id, funded_token)
        incomplete = {k: v for k, v in self.ADDR.items() if k != 'postal_code'}
        rv = client.post(self.URL,
                         json={'opening_id': opening_id, **incomplete},
                         headers=auth_header(funded_token))
        assert rv.status_code == 400
        assert 'postal_code' in str(rv.get_json()['error'])

    def test_ship_already_shipped_fails(self, client, db, funded_user, funded_token, box):
        opening_id = _open_box(client, box.id, funded_token)
        client.post(self.URL, json={'opening_id': opening_id, **self.ADDR},
                    headers=auth_header(funded_token))
        rv = client.post(self.URL, json={'opening_id': opening_id, **self.ADDR},
                         headers=auth_header(funded_token))
        assert rv.status_code == 404

    def test_ship_requires_auth(self, client, db):
        rv = client.post(self.URL, json={'opening_id': 1, **self.ADDR})
        assert rv.status_code == 401
