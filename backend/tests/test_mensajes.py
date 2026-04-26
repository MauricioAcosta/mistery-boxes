"""Pruebas de calidad y claridad de mensajes del sistema.

Verifica que TODOS los mensajes de error y éxito:
- Estén en español
- Sean comprensibles para un usuario sin conocimientos técnicos
- No expongan términos técnicos en inglés (balance, wallet, opening_id, etc.)
- Sean completos (mínimo 2 palabras, no solo un código)
- Indiquen claramente qué ocurrió y qué debe hacer el usuario

Este módulo es el "contrato de lenguaje" de la plataforma.
"""
import pytest
from unittest.mock import patch
from app.extensions import db as _db
from tests.conftest import auth_header, make_user, make_box


# ── Utilidades de aserción ────────────────────────────────────────────────────

TERMINOS_TECNICOS_INGLES = [
    'required', 'not found', 'invalid', 'failed', 'forbidden',
    'unauthorized', 'bad request', 'missing field', 'wallet',
    'insufficient balance', 'insufficient coins', 'opening not found',
]


def verificar_mensaje_en_espanol(mensaje: str, contexto: str = ''):
    """Verifica que un mensaje no contenga frases técnicas en inglés."""
    texto = mensaje.lower()
    for termino in TERMINOS_TECNICOS_INGLES:
        assert termino not in texto, (
            f"[{contexto}] El mensaje contiene término en inglés '{termino}': «{mensaje}»"
        )


def verificar_mensaje_comprensible(mensaje: str, contexto: str = ''):
    """El mensaje debe tener al menos 2 palabras."""
    palabras = mensaje.strip().split()
    assert len(palabras) >= 2, (
        f"[{contexto}] El mensaje es demasiado corto: «{mensaje}»"
    )


def verificar_respuesta_error(rv, contexto: str = ''):
    """Verifica que una respuesta de error tenga la estructura correcta."""
    data = rv.get_json()
    assert 'error' in data, f"[{contexto}] La respuesta no tiene clave 'error': {data}"
    msg = data['error']
    assert isinstance(msg, str), f"[{contexto}] El campo 'error' no es texto: {msg}"
    verificar_mensaje_en_espanol(msg, contexto)
    verificar_mensaje_comprensible(msg, contexto)
    return msg


# ═══════════════════════════════════════════════════════════════════════════════
# Mensajes de autenticación y registro
# ═══════════════════════════════════════════════════════════════════════════════

class TestMensajesAutenticacion:

    def test_registro_campos_faltantes(self, client, db):
        rv = client.post('/api/auth/register', json={'email': 'x@x.com'})
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'registro-campos-faltantes')
        assert 'obligatorio' in msg.lower() or 'contraseña' in msg.lower()

    def test_registro_contrasena_corta(self, client, db):
        rv = client.post('/api/auth/register', json={
            'username': 'u', 'email': 'u@u.com', 'password': '123',
        })
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'contraseña-corta')
        assert 'contraseña' in msg.lower()
        assert '8' in msg

    def test_registro_nombre_duplicado(self, client, db, user):
        rv = client.post('/api/auth/register', json={
            'username': user.username, 'email': 'otro@email.com', 'password': 'pass1234',
        })
        assert rv.status_code == 409
        msg = verificar_respuesta_error(rv, 'nombre-duplicado')
        assert 'usuario' in msg.lower()

    def test_registro_correo_duplicado(self, client, db, user):
        rv = client.post('/api/auth/register', json={
            'username': 'nuevo_u', 'email': user.email, 'password': 'pass1234',
        })
        assert rv.status_code == 409
        msg = verificar_respuesta_error(rv, 'correo-duplicado')
        assert 'correo' in msg.lower()

    def test_login_campos_faltantes(self, client, db):
        rv = client.post('/api/auth/login', json={'email': 'x@x.com'})
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'login-campos-faltantes')
        assert 'correo' in msg.lower() or 'contraseña' in msg.lower()

    def test_login_credenciales_incorrectas(self, client, db, user):
        rv = client.post('/api/auth/login', json={
            'email': user.email, 'password': 'clave_incorrecta',
        })
        assert rv.status_code == 401
        msg = verificar_respuesta_error(rv, 'credenciales-incorrectas')
        assert 'credencial' in msg.lower() or 'incorrect' in msg.lower()

    def test_login_cuenta_deshabilitada(self, client, db):
        user = make_user(username='inactivo', email='inactivo@test.com')
        user.is_active = False
        _db.session.commit()
        rv = client.post('/api/auth/login', json={
            'email': 'inactivo@test.com', 'password': 'password123',
        })
        assert rv.status_code == 403
        msg = verificar_respuesta_error(rv, 'cuenta-deshabilitada')
        assert 'cuenta' in msg.lower() or 'deshabilitada' in msg.lower()

    def test_recuperacion_email_faltante(self, client, db):
        rv = client.post('/api/auth/forgot-password', json={})
        assert rv.status_code == 400
        verificar_respuesta_error(rv, 'forgot-password-sin-email')

    def test_reset_token_invalido(self, client, db):
        rv = client.post('/api/auth/reset-password', json={
            'token': 'token_falso', 'password': 'nueva_clave123',
        })
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'reset-token-invalido')
        assert 'válido' in msg.lower() or 'expirado' in msg.lower()

    def test_reset_contrasena_corta(self, client, db):
        import secrets
        from datetime import timedelta
        user = make_user(username='reset_msg', email='reset_msg@test.com')
        user.reset_token = secrets.token_urlsafe(32)
        from datetime import datetime
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        _db.session.commit()
        rv = client.post('/api/auth/reset-password', json={
            'token': user.reset_token, 'password': 'corta',
        })
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'reset-contraseña-corta')
        assert 'contraseña' in msg.lower()


# ═══════════════════════════════════════════════════════════════════════════════
# Mensajes de billetera y depósitos
# ═══════════════════════════════════════════════════════════════════════════════

class TestMensajesBilletera:

    def test_deposito_monto_faltante(self, client, db, user, user_token):
        rv = client.post('/api/wallet/deposit', json={},
                         headers=auth_header(user_token))
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'deposito-sin-monto')
        assert 'monto' in msg.lower() or 'obligatorio' in msg.lower()

    def test_deposito_monto_no_numerico(self, client, db, user, user_token):
        rv = client.post('/api/wallet/deposit', json={'amount': 'cien'},
                         headers=auth_header(user_token))
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'deposito-no-numerico')
        assert 'numérico' in msg.lower() or 'número' in msg.lower()

    def test_deposito_monto_cero(self, client, db, user, user_token):
        rv = client.post('/api/wallet/deposit', json={'amount': 0},
                         headers=auth_header(user_token))
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'deposito-monto-cero')
        assert '1' in msg and '1000' in msg

    def test_deposito_monto_excesivo(self, client, db, user, user_token):
        rv = client.post('/api/wallet/deposit', json={'amount': 99999},
                         headers=auth_header(user_token))
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'deposito-excesivo')
        assert '1000' in msg

    def test_deposito_exitoso_tiene_mensaje(self, client, db, user, user_token):
        rv = client.post('/api/wallet/deposit', json={'amount': 25.00},
                         headers=auth_header(user_token))
        assert rv.status_code == 200
        data = rv.get_json()
        assert 'message' in data
        verificar_mensaje_en_espanol(data['message'], 'deposito-exitoso')
        verificar_mensaje_comprensible(data['message'], 'deposito-exitoso')

    def test_compra_coins_monto_faltante(self, client, db, funded_token):
        rv = client.post('/api/wallet/buy-coins', json={},
                         headers=auth_header(funded_token))
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'coins-sin-monto')
        assert 'monto' in msg.lower() or 'obligatorio' in msg.lower()

    def test_compra_coins_no_numerico(self, client, db, funded_token):
        rv = client.post('/api/wallet/buy-coins', json={'usd_amount': 'mucho'},
                         headers=auth_header(funded_token))
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'coins-no-numerico')
        assert 'numérico' in msg.lower() or 'número' in msg.lower()

    def test_compra_coins_saldo_insuficiente(self, client, db, user, user_token):
        rv = client.post('/api/wallet/buy-coins', json={'usd_amount': 100.00},
                         headers=auth_header(user_token))
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'coins-saldo-insuficiente')
        assert 'saldo' in msg.lower() or 'insuficiente' in msg.lower()


# ═══════════════════════════════════════════════════════════════════════════════
# Mensajes de apertura de cajas
# ═══════════════════════════════════════════════════════════════════════════════

class TestMensajesCajas:

    def test_saldo_insuficiente_mensaje_claro(self, client, db, user, user_token, box):
        rv = client.post(f'/api/boxes/{box.id}/open',
                         headers=auth_header(user_token))
        assert rv.status_code == 402
        msg = verificar_respuesta_error(rv, 'saldo-insuficiente')
        assert 'saldo' in msg.lower() or 'insuficiente' in msg.lower()

    def test_caja_no_acepta_monedas_mensaje_claro(
            self, client, db, funded_user, funded_token, box):
        funded_user.wallet.coins = 9999
        _db.session.commit()
        rv = client.post(f'/api/boxes/{box.id}/open',
                         json={'payment_method': 'coins'},
                         headers=auth_header(funded_token))
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'caja-no-acepta-monedas')
        assert 'moneda' in msg.lower() or 'caja' in msg.lower()

    def test_monedas_insuficientes_mensaje_claro(
            self, client, db, funded_user, funded_token):
        from tests.test_coins import make_caja_con_monedas
        caja = make_caja_con_monedas(precio_coins=999)
        rv = client.post(f'/api/boxes/{caja.id}/open',
                         json={'payment_method': 'coins'},
                         headers=auth_header(funded_token))
        assert rv.status_code == 402
        msg = verificar_respuesta_error(rv, 'monedas-insuficientes')
        assert 'moneda' in msg.lower() or 'insuficiente' in msg.lower()


# ═══════════════════════════════════════════════════════════════════════════════
# Mensajes de canje y envío
# ═══════════════════════════════════════════════════════════════════════════════

class TestMensajesCanje:

    def test_canje_sin_id_apertura(self, client, db, funded_token):
        rv = client.post('/api/exchange', json={},
                         headers=auth_header(funded_token))
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'canje-sin-opening-id')
        assert 'apertura' in msg.lower() or 'obligatorio' in msg.lower()

    def test_canje_apertura_no_encontrada(self, client, db, funded_token):
        rv = client.post('/api/exchange', json={'opening_id': 999999},
                         headers=auth_header(funded_token))
        assert rv.status_code == 404
        msg = verificar_respuesta_error(rv, 'canje-apertura-no-encontrada')
        assert 'apertura' in msg.lower() or 'procesada' in msg.lower()

    def test_canje_exitoso_tiene_mensaje(self, client, db, funded_user, funded_token, box):
        open_rv = client.post(f'/api/boxes/{box.id}/open',
                              headers=auth_header(funded_token))
        opening_id = open_rv.get_json()['opening_id']
        rv = client.post('/api/exchange', json={'opening_id': opening_id},
                         headers=auth_header(funded_token))
        assert rv.status_code == 200
        data = rv.get_json()
        assert 'message' in data
        verificar_mensaje_en_espanol(data['message'], 'canje-exitoso')

    def test_envio_datos_faltantes(self, client, db, funded_user, funded_token, box):
        open_rv = client.post(f'/api/boxes/{box.id}/open',
                              headers=auth_header(funded_token))
        opening_id = open_rv.get_json()['opening_id']
        # Solo enviar el opening_id, faltan los datos de dirección
        rv = client.post('/api/ship', json={'opening_id': opening_id},
                         headers=auth_header(funded_token))
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'envio-datos-faltantes')
        # El mensaje debe mencionar qué datos faltan en español
        assert ('nombre' in msg.lower() or 'dirección' in msg.lower() or
                'ciudad' in msg.lower() or 'dato' in msg.lower())

    def test_envio_sin_saldo_para_costo(self, client, db, user, user_token, box):
        """Usuario con saldo justo para la caja pero sin $5 para el envío."""
        user.wallet.balance = 10.01  # solo alcanza para abrir la caja
        _db.session.commit()
        open_rv = client.post(f'/api/boxes/{box.id}/open',
                              headers=auth_header(user_token))
        assert open_rv.status_code == 200
        opening_id = open_rv.get_json()['opening_id']

        rv = client.post('/api/ship', json={
            'opening_id': opening_id,
            'full_name': 'Juan Test', 'address': 'Calle 1',
            'city': 'Bogotá', 'country': 'Colombia', 'postal_code': '110111',
        }, headers=auth_header(user_token))
        # El saldo restante (~$0.01) no alcanza para el envío ($5.00)
        assert rv.status_code == 402
        msg = rv.get_json()['error'].lower()
        assert 'envío' in msg or 'costo' in msg or '5' in msg


# ═══════════════════════════════════════════════════════════════════════════════
# Mensajes de administración
# ═══════════════════════════════════════════════════════════════════════════════

class TestMensajesAdmin:

    def test_acceso_sin_permiso_de_admin(self, client, db, user, user_token):
        rv = client.get('/api/admin/products', headers=auth_header(user_token))
        assert rv.status_code == 403
        msg = verificar_respuesta_error(rv, 'acceso-sin-admin')
        assert 'administrador' in msg.lower()

    def test_acceso_sin_permiso_de_super_admin(self, client, db, user, user_token):
        rv = client.get('/api/admin/users', headers=auth_header(user_token))
        assert rv.status_code == 403
        msg = verificar_respuesta_error(rv, 'acceso-sin-super-admin')
        assert 'administrador' in msg.lower()

    def test_crear_producto_sin_nombre(self, client, db):
        from tests.test_admin import make_super_admin
        from tests.conftest import login as do_login
        admin = make_super_admin(username='sa_msg', email='sa_msg@test.com')
        token = do_login(client, admin.email, 'admin1234')
        rv = client.post('/api/admin/products',
                         json={'retail_value': 50.0},
                         headers=auth_header(token))
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'crear-producto-sin-nombre')
        assert 'nombre' in msg.lower() or 'obligatorio' in msg.lower()

    def test_configuracion_margen_invalido(self, client, db):
        from tests.test_admin import make_super_admin
        from tests.conftest import login as do_login
        admin = make_super_admin(username='sa_cfg', email='sa_cfg@test.com')
        token = do_login(client, admin.email, 'admin1234')
        rv = client.patch('/api/admin/config',
                          json={'house_edge_pct': 999},
                          headers=auth_header(token))
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'config-margen-invalido')
        assert 'margen' in msg.lower() or 'plataforma' in msg.lower()

    def test_configuracion_intensidad_invalida(self, client, db):
        from tests.test_admin import make_super_admin
        from tests.conftest import login as do_login
        admin = make_super_admin(username='sa_int', email='sa_int@test.com')
        token = do_login(client, admin.email, 'admin1234')
        rv = client.patch('/api/admin/config',
                          json={'margin_strength': 5.0},
                          headers=auth_header(token))
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'config-intensidad-invalida')
        assert 'intensidad' in msg.lower()


# ═══════════════════════════════════════════════════════════════════════════════
# Mensajes de verificación (endpoint público)
# ═══════════════════════════════════════════════════════════════════════════════

class TestMensajesVerificacion:

    def test_verificacion_campos_faltantes(self, client, db):
        rv = client.post('/api/verify', json={'server_seed': 'abc'})
        assert rv.status_code == 400
        msg = verificar_respuesta_error(rv, 'verificacion-campos-faltantes')
        assert 'campo' in msg.lower() or 'falt' in msg.lower()

    def test_verificacion_caja_inexistente(self, client, db, funded_user, funded_token, box):
        open_rv = client.post(f'/api/boxes/{box.id}/open',
                              headers=auth_header(funded_token))
        proof = open_rv.get_json()['proof']
        rv = client.post('/api/verify', json={
            'server_seed': proof['server_seed'],
            'client_seed': proof['client_seed'],
            'nonce': proof['nonce'],
            'box_id': 999999,
        })
        assert rv.status_code == 404
