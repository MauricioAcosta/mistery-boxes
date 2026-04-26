"""Integration tests for /api/auth/* endpoints."""
import pytest
from tests.conftest import make_user, auth_header


# ── Register ─────────────────────────────────────────────────────────────────

class TestRegister:
    URL = '/api/auth/register'

    def test_register_success(self, client, db):
        rv = client.post(self.URL, json={
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'securepass',
        })
        assert rv.status_code == 201
        data = rv.get_json()
        assert 'token' in data
        assert data['user']['username'] == 'newuser'
        assert data['user']['email']    == 'newuser@example.com'
        assert 'wallet' in data

    def test_register_missing_field(self, client, db):
        rv = client.post(self.URL, json={'username': 'x', 'email': 'x@x.com'})
        assert rv.status_code == 400
        assert 'contraseña' in rv.get_json()['error'].lower() or 'obligatorio' in rv.get_json()['error'].lower()

    def test_register_short_password(self, client, db):
        rv = client.post(self.URL, json={
            'username': 'shortpw', 'email': 'shortpw@example.com', 'password': '1234',
        })
        assert rv.status_code == 400
        assert '8' in rv.get_json()['error']

    def test_register_duplicate_username(self, client, db, user):
        rv = client.post(self.URL, json={
            'username': user.username,
            'email': 'other@example.com',
            'password': 'password123',
        })
        assert rv.status_code == 409
        assert 'usuario' in rv.get_json()['error'].lower()

    def test_register_duplicate_email(self, client, db, user):
        rv = client.post(self.URL, json={
            'username': 'differentname',
            'email': user.email,
            'password': 'password123',
        })
        assert rv.status_code == 409
        assert 'correo' in rv.get_json()['error'].lower()


# ── Login ─────────────────────────────────────────────────────────────────────

class TestLogin:
    URL = '/api/auth/login'

    def test_login_success(self, client, db, user):
        rv = client.post(self.URL, json={'email': user.email, 'password': 'password123'})
        assert rv.status_code == 200
        data = rv.get_json()
        assert 'token' in data
        assert data['user']['id'] == user.id

    def test_login_wrong_password(self, client, db, user):
        rv = client.post(self.URL, json={'email': user.email, 'password': 'wrongpassword'})
        assert rv.status_code == 401

    def test_login_unknown_email(self, client, db):
        rv = client.post(self.URL, json={'email': 'nobody@example.com', 'password': 'pass1234'})
        assert rv.status_code == 401

    def test_login_missing_fields(self, client, db):
        rv = client.post(self.URL, json={'email': 'x@x.com'})
        assert rv.status_code == 400


# ── /me ───────────────────────────────────────────────────────────────────────

class TestMe:
    URL = '/api/auth/me'

    def test_me_authenticated(self, client, db, user, user_token):
        rv = client.get(self.URL, headers=auth_header(user_token))
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['user']['id'] == user.id
        assert 'wallet' in data
        assert 'active_seed' in data

    def test_me_no_token(self, client, db):
        rv = client.get(self.URL)
        assert rv.status_code == 401

    def test_me_bad_token(self, client, db):
        rv = client.get(self.URL, headers={'Authorization': 'Bearer invalid.token.here'})
        assert rv.status_code == 422


# ── Seed rotation ─────────────────────────────────────────────────────────────

class TestSeedRotate:
    URL = '/api/auth/seed/rotate'

    def test_rotate_creates_new_seed(self, client, db, user, user_token):
        # Get the current seed hash
        me_before = client.get('/api/auth/me', headers=auth_header(user_token)).get_json()
        old_hash  = me_before['active_seed']['server_seed_hash']

        rv = client.post(self.URL, headers=auth_header(user_token))
        assert rv.status_code == 200
        data = rv.get_json()
        assert 'old_server_seed' in data
        assert 'new_server_seed_hash' in data
        assert data['new_server_seed_hash'] != old_hash

    def test_rotate_requires_auth(self, client, db):
        rv = client.post(self.URL)
        assert rv.status_code == 401
