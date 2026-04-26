"""Integration tests for /api/boxes/* and /api/openings endpoints."""
import pytest
from tests.conftest import auth_header, make_box, make_user


class TestListBoxes:
    URL = '/api/boxes'

    def test_list_boxes_public(self, client, db, box):
        rv = client.get(self.URL)
        assert rv.status_code == 200
        data = rv.get_json()
        assert isinstance(data, list)
        assert any(b['id'] == box.id for b in data)

    def test_list_boxes_by_category(self, client, db, box):
        # box fixture uses category='tech'
        rv = client.get(self.URL, query_string={'category': 'tech'})
        assert rv.status_code == 200
        for b in rv.get_json():
            assert b['category'] == 'tech'

    def test_list_boxes_wrong_category_returns_empty(self, client, db, box):
        rv = client.get(self.URL, query_string={'category': 'nonexistent_cat'})
        assert rv.status_code == 200
        assert rv.get_json() == []


class TestGetBox:
    def test_get_box_success(self, client, db, box):
        rv = client.get(f'/api/boxes/{box.id}')
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['id'] == box.id
        assert 'items' in data
        assert len(data['items']) == 2

    def test_get_box_not_found(self, client, db):
        rv = client.get('/api/boxes/999999')
        assert rv.status_code == 404

    def test_get_box_includes_rtp_and_ev(self, client, db, box):
        data = client.get(f'/api/boxes/{box.id}').get_json()
        assert 'rtp_pct'         in data
        assert 'expected_value'  in data
        assert data['rtp_pct']   > 0


class TestOpenBox:
    def _open(self, client, box_id, token):
        return client.post(
            f'/api/boxes/{box_id}/open',
            headers=auth_header(token),
        )

    def test_open_box_success(self, client, db, funded_user, funded_token, box):
        rv = self._open(client, box.id, funded_token)
        assert rv.status_code == 200
        data = rv.get_json()
        assert 'opening_id'      in data
        assert 'won'             in data
        assert 'proof'           in data
        assert 'wallet_balance'  in data

        proof = data['proof']
        assert 'server_seed'      in proof
        assert 'server_seed_hash' in proof
        assert 'client_seed'      in proof
        assert 'nonce'            in proof
        assert 0 <= proof['result_float'] < 1

    def test_open_box_deducts_balance(self, client, db, funded_user, funded_token, box):
        before = funded_user.wallet.balance
        self._open(client, box.id, funded_token)
        db.session.refresh(funded_user.wallet)
        assert float(funded_user.wallet.balance) == pytest.approx(float(before) - float(box.price))

    def test_open_box_insufficient_balance(self, client, db, user, user_token, box):
        # user.wallet starts at $0
        rv = self._open(client, box.id, user_token)
        assert rv.status_code == 402
        assert 'saldo' in rv.get_json()['error'].lower()

    def test_open_box_requires_auth(self, client, db, box):
        rv = client.post(f'/api/boxes/{box.id}/open')
        assert rv.status_code == 401

    def test_open_box_not_found(self, client, db, funded_token):
        rv = self._open(client, 999999, funded_token)
        assert rv.status_code == 404

    def test_open_box_winner_is_valid_item(self, client, db, funded_user, funded_token, box):
        rv = self._open(client, box.id, funded_token)
        won_id = rv.get_json()['won']['id']
        item_product_ids = [item['product']['id'] for item in
                            client.get(f'/api/boxes/{box.id}').get_json()['items']]
        assert won_id in item_product_ids

    def test_open_box_increments_total_openings(self, client, db, funded_user, funded_token, box):
        before = box.total_openings
        self._open(client, box.id, funded_token)
        db.session.refresh(box)
        assert box.total_openings == before + 1


class TestOpenings:
    URL = '/api/openings'

    def test_get_openings_empty(self, client, db, user, user_token):
        rv = client.get(self.URL, headers=auth_header(user_token))
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['total'] == 0
        assert data['openings'] == []

    def test_get_openings_after_open(self, client, db, funded_user, funded_token, box):
        client.post(f'/api/boxes/{box.id}/open', headers=auth_header(funded_token))
        rv = client.get(self.URL, headers=auth_header(funded_token))
        data = rv.get_json()
        assert data['total'] == 1
        opening = data['openings'][0]
        assert 'proof' in opening
        assert opening['status'] == 'pending'

    def test_get_openings_requires_auth(self, client, db):
        rv = client.get(self.URL)
        assert rv.status_code == 401

    def test_get_openings_pagination(self, client, db, funded_user, funded_token, box):
        # Give the user enough balance for 3 opens
        funded_user.wallet.balance = 1000.00
        db.session.commit()
        for _ in range(3):
            client.post(f'/api/boxes/{box.id}/open', headers=auth_header(funded_token))

        rv = client.get(self.URL, query_string={'page': 1, 'per_page': 2},
                        headers=auth_header(funded_token))
        data = rv.get_json()
        assert data['total'] == 3
        assert len(data['openings']) == 2
        assert data['pages'] == 2
