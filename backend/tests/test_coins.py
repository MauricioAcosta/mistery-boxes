"""Pruebas de integración para el sistema de monedas (coins).

Cubre:
- Compra de monedas con saldo USD
- Apertura de cajas usando monedas como método de pago
- Validaciones y errores del sistema de monedas
"""
import pytest
from app.extensions import db as _db
from app.models import Box, Product, BoxItem
from app.services.wallet_service import WalletService
from tests.conftest import auth_header, login, make_user


# ── Helper: caja con soporte de monedas ──────────────────────────────────────

def make_caja_con_monedas(nombre='Caja Coins', precio=10.00, precio_coins=500):
    """Crea una caja que acepta tanto USD como monedas."""
    box = Box(
        name=nombre, price=precio, price_coins=precio_coins,
        category='tech', description='Caja con opción de monedas',
        image_url='https://example.com/box.jpg',
    )
    _db.session.add(box)
    _db.session.flush()
    producto = Product(
        name='Premio Coins', brand='Brand', category='tech',
        retail_value=50.00, rarity='common',
        description='Un premio', image_url='https://example.com/p.jpg',
    )
    _db.session.add(producto)
    _db.session.flush()
    _db.session.add(BoxItem(box_id=box.id, product_id=producto.id, weight=100))
    _db.session.commit()
    return box


# ═══════════════════════════════════════════════════════════════════════════════
# Compra de monedas
# ═══════════════════════════════════════════════════════════════════════════════

class TestCompraMonedas:
    URL = '/api/wallet/buy-coins'

    def test_compra_exitosa(self, client, db, funded_user, funded_token):
        """1 USD = 100 monedas. Comprar $5 da 500 monedas."""
        rv = client.post(self.URL, json={'usd_amount': 5.00},
                         headers=auth_header(funded_token))
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['coins_added'] == 500
        assert data['wallet']['coins'] == 500

    def test_compra_descuenta_saldo_usd(self, client, db, funded_user, funded_token):
        saldo_antes = float(funded_user.wallet.balance)
        client.post(self.URL, json={'usd_amount': 10.00},
                    headers=auth_header(funded_token))
        rv = client.get('/api/wallet', headers=auth_header(funded_token))
        saldo_despues = float(rv.get_json()['wallet']['balance'])
        assert saldo_despues == pytest.approx(saldo_antes - 10.00)

    def test_varias_compras_acumulan_monedas(self, client, db, funded_user, funded_token):
        client.post(self.URL, json={'usd_amount': 1.00}, headers=auth_header(funded_token))
        client.post(self.URL, json={'usd_amount': 2.00}, headers=auth_header(funded_token))
        rv = client.get('/api/wallet', headers=auth_header(funded_token))
        assert rv.get_json()['wallet']['coins'] == 300  # 100 + 200

    def test_saldo_insuficiente_falla(self, client, db, user, user_token):
        """Usuario con $0 no puede comprar monedas."""
        rv = client.post(self.URL, json={'usd_amount': 50.00},
                         headers=auth_header(user_token))
        assert rv.status_code == 400
        msg = rv.get_json()['error'].lower()
        assert 'saldo' in msg or 'insuficiente' in msg

    def test_monto_faltante_falla(self, client, db, funded_token):
        rv = client.post(self.URL, json={}, headers=auth_header(funded_token))
        assert rv.status_code == 400
        assert 'obligatorio' in rv.get_json()['error'].lower()

    def test_monto_no_numerico_falla(self, client, db, funded_token):
        rv = client.post(self.URL, json={'usd_amount': 'mucho'},
                         headers=auth_header(funded_token))
        assert rv.status_code == 400
        assert 'numérico' in rv.get_json()['error'].lower()

    def test_monto_cero_invalido(self, client, db, funded_token):
        rv = client.post(self.URL, json={'usd_amount': 0},
                         headers=auth_header(funded_token))
        assert rv.status_code == 400

    def test_monto_negativo_invalido(self, client, db, funded_token):
        rv = client.post(self.URL, json={'usd_amount': -5},
                         headers=auth_header(funded_token))
        assert rv.status_code == 400

    def test_monto_sobre_maximo_invalido(self, client, db, funded_token):
        rv = client.post(self.URL, json={'usd_amount': 600},
                         headers=auth_header(funded_token))
        assert rv.status_code == 400
        assert '500' in rv.get_json()['error']

    def test_requiere_autenticacion(self, client, db):
        rv = client.post(self.URL, json={'usd_amount': 10.00})
        assert rv.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
# Apertura de cajas con monedas
# ═══════════════════════════════════════════════════════════════════════════════

class TestAbrirCajaConMonedas:

    def test_abrir_caja_con_monedas_exitoso(self, client, db, funded_user, funded_token):
        caja = make_caja_con_monedas(precio_coins=500)
        funded_user.wallet.coins = 1000
        _db.session.commit()

        rv = client.post(f'/api/boxes/{caja.id}/open',
                         json={'payment_method': 'coins'},
                         headers=auth_header(funded_token))
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['payment_method'] == 'coins'
        assert data['wallet_coins'] == 500        # 1000 - 500
        assert 'won' in data
        assert 'proof' in data

    def test_abrir_con_coins_no_descuenta_saldo_usd(self, client, db, funded_user, funded_token):
        """Pagar con monedas no debe afectar el saldo en USD."""
        caja = make_caja_con_monedas(precio_coins=100)
        funded_user.wallet.coins = 500
        saldo_usd_antes = float(funded_user.wallet.balance)
        _db.session.commit()

        client.post(f'/api/boxes/{caja.id}/open',
                    json={'payment_method': 'coins'},
                    headers=auth_header(funded_token))

        _db.session.refresh(funded_user.wallet)
        assert float(funded_user.wallet.balance) == pytest.approx(saldo_usd_antes)

    def test_monedas_insuficientes_falla(self, client, db, funded_user, funded_token):
        """Usuario con 0 monedas no puede abrir caja con monedas."""
        caja = make_caja_con_monedas(precio_coins=500)

        rv = client.post(f'/api/boxes/{caja.id}/open',
                         json={'payment_method': 'coins'},
                         headers=auth_header(funded_token))
        assert rv.status_code == 402
        assert 'moneda' in rv.get_json()['error'].lower()

    def test_caja_sin_opcion_de_monedas_falla(self, client, db, funded_user, funded_token, box):
        """La caja del fixture no tiene price_coins configurado."""
        funded_user.wallet.coins = 9999
        _db.session.commit()

        rv = client.post(f'/api/boxes/{box.id}/open',
                         json={'payment_method': 'coins'},
                         headers=auth_header(funded_token))
        assert rv.status_code == 400
        msg = rv.get_json()['error'].lower()
        assert 'moneda' in msg or 'caja' in msg

    def test_apertura_con_monedas_queda_en_historial(self, client, db, funded_user, funded_token):
        caja = make_caja_con_monedas(precio_coins=200)
        funded_user.wallet.coins = 500
        _db.session.commit()

        client.post(f'/api/boxes/{caja.id}/open',
                    json={'payment_method': 'coins'},
                    headers=auth_header(funded_token))

        rv = client.get('/api/openings', headers=auth_header(funded_token))
        historial = rv.get_json()['openings']
        assert len(historial) == 1
        assert historial[0]['status'] == 'pending'

    def test_flujo_completo_comprar_monedas_y_abrir_caja(
            self, client, db, funded_user, funded_token):
        """Flujo completo: depositar → comprar monedas → abrir caja."""
        caja = make_caja_con_monedas(precio_coins=300)

        # Comprar monedas
        buy_rv = client.post('/api/wallet/buy-coins',
                             json={'usd_amount': 5.00},
                             headers=auth_header(funded_token))
        assert buy_rv.status_code == 200
        assert buy_rv.get_json()['wallet']['coins'] == 500

        # Abrir caja con monedas
        open_rv = client.post(f'/api/boxes/{caja.id}/open',
                              json={'payment_method': 'coins'},
                              headers=auth_header(funded_token))
        assert open_rv.status_code == 200
        assert open_rv.get_json()['wallet_coins'] == 200  # 500 - 300
