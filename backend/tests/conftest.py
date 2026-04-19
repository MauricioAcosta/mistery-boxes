"""
Shared pytest fixtures for all backend integration tests.

The test suite uses an in-memory SQLite database (TestingConfig) so
no running PostgreSQL instance is needed.  Every test function gets a
fully isolated database: tables are created before the test and dropped
after, which is fast for in-memory SQLite.
"""
import pytest
from app import create_app
from app.extensions import db as _db
from app.models import User, Wallet, Product, Box, BoxItem
from app.services.provably_fair import ProvablyFairService


# ── App fixture (session-scoped — one Flask app for the whole run) ────────────

@pytest.fixture(scope='session')
def app():
    application = create_app('testing')
    yield application


# ── Database fixture (function-scoped — fresh schema per test) ────────────────

@pytest.fixture(scope='function')
def db(app):
    """
    Yield a clean database for every test.
    Tables are created before and dropped after each test function.
    SQLite in-memory makes this essentially free.
    """
    with app.app_context():
        _db.create_all()
        yield _db
        _db.session.remove()
        _db.drop_all()


# ── Flask test client ─────────────────────────────────────────────────────────

@pytest.fixture(scope='function')
def client(app, db):
    """Flask test client tied to the same app context as `db`."""
    with app.test_client() as c:
        yield c


# ── Helper factories ──────────────────────────────────────────────────────────

def make_user(username='testuser', email='test@example.com',
              password='password123', role='user'):
    """Create a User + Wallet + seed pair inside the current app context."""
    user = User(username=username, email=email, role=role)
    user.set_password(password)
    wallet = Wallet(user=user, balance=0.0)
    _db.session.add(user)
    _db.session.add(wallet)
    _db.session.flush()
    ProvablyFairService.create_seed_pair(user.id)
    _db.session.commit()
    return user


def make_box(name='Test Box', price=10.00, category='tech'):
    """Create a Box with one rare + one common item."""
    box = Box(
        name=name, price=price, category=category,
        description='Test box',
        image_url='https://example.com/box.jpg',
    )
    _db.session.add(box)
    _db.session.flush()

    p_rare = Product(
        name='Rare Item', brand='Brand', category='tech',
        retail_value=100.00, rarity='rare',
        description='A rare item',
        image_url='https://example.com/rare.jpg',
    )
    p_common = Product(
        name='Common Item', brand='Brand', category='tech',
        retail_value=5.00, rarity='common',
        description='A common item',
        image_url='https://example.com/common.jpg',
    )
    _db.session.add(p_rare)
    _db.session.add(p_common)
    _db.session.flush()

    _db.session.add(BoxItem(box_id=box.id, product_id=p_rare.id,   weight=10))
    _db.session.add(BoxItem(box_id=box.id, product_id=p_common.id, weight=90))
    _db.session.commit()
    return box


def login(client, email='test@example.com', password='password123'):
    """POST /api/auth/login and return the JWT token string."""
    rv = client.post('/api/auth/login', json={'email': email, 'password': password})
    assert rv.status_code == 200, rv.get_json()
    return rv.get_json()['token']


def auth_header(token):
    """Return an Authorization header dict for the given JWT token."""
    return {'Authorization': f'Bearer {token}'}


# ── Composed fixtures ─────────────────────────────────────────────────────────

@pytest.fixture
def user(db):
    return make_user()


@pytest.fixture
def user_token(client, user):
    return login(client, user.email)


@pytest.fixture
def funded_user(db):
    """A user pre-loaded with $100."""
    u = make_user(username='funded', email='funded@example.com')
    u.wallet.balance = 100.00
    _db.session.commit()
    _db.session.refresh(u)
    return u


@pytest.fixture
def funded_token(client, funded_user):
    return login(client, funded_user.email)


@pytest.fixture
def box(db):
    return make_box()
