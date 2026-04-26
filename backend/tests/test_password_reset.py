"""Pruebas de integración para el flujo de recuperación de contraseña.

Cubre:
- Solicitud de enlace de recuperación (forgot-password)
- Restablecimiento con token válido (reset-password)
- Seguridad: tokens expirados, tokens reutilizados, enumeración de usuarios
"""
import secrets
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch

from app.extensions import db as _db
from tests.conftest import auth_header, make_user, login


# ═══════════════════════════════════════════════════════════════════════════════
# Solicitud de recuperación (forgot-password)
# ═══════════════════════════════════════════════════════════════════════════════

class TestForgotPassword:
    URL = '/api/auth/forgot-password'

    def test_email_faltante_retorna_error(self, client, db):
        rv = client.post(self.URL, json={})
        assert rv.status_code == 400
        assert rv.get_json()['error']  # debe tener mensaje descriptivo

    def test_email_vacio_retorna_error(self, client, db):
        rv = client.post(self.URL, json={'email': ''})
        assert rv.status_code == 400

    def test_email_desconocido_retorna_200_sin_revelar(self, client, db):
        """Por seguridad, no se debe revelar si el correo existe o no."""
        rv = client.post(self.URL, json={'email': 'noexiste@ejemplo.com'})
        assert rv.status_code == 200
        data = rv.get_json()
        assert 'message' in data
        # El mensaje no debe indicar que el correo no existe
        assert 'no existe' not in data['message'].lower()
        assert 'not found' not in data['message'].lower()

    def test_email_conocido_genera_token_en_bd(self, client, db):
        """El token se debe guardar en la base de datos con fecha de expiración."""
        user = make_user(username='reset_user', email='reset@test.com')

        with patch('resend.Emails.send', return_value={'id': 'mock_id'}):
            rv = client.post(self.URL, json={'email': user.email})

        assert rv.status_code == 200
        _db.session.refresh(user)
        assert user.reset_token is not None
        assert len(user.reset_token) > 20  # token suficientemente largo
        assert user.reset_token_expires is not None
        assert user.reset_token_expires > datetime.utcnow()

    def test_token_expira_en_una_hora(self, client, db):
        """El token debe expirar dentro de aproximadamente 1 hora."""
        user = make_user(username='exp_user', email='exp@test.com')

        with patch('resend.Emails.send', return_value={'id': 'mock_id'}):
            client.post(self.URL, json={'email': user.email})

        _db.session.refresh(user)
        diferencia = user.reset_token_expires - datetime.utcnow()
        # Debe ser entre 55 y 65 minutos
        assert timedelta(minutes=55) < diferencia < timedelta(minutes=65)

    def test_mismo_correo_dos_veces_genera_nuevo_token(self, client, db):
        """Si se solicita dos veces, el segundo token reemplaza al primero."""
        user = make_user(username='dos_veces', email='dos@test.com')

        with patch('resend.Emails.send', return_value={'id': 'mock_id'}):
            client.post(self.URL, json={'email': user.email})
            _db.session.refresh(user)
            primer_token = user.reset_token

            client.post(self.URL, json={'email': user.email})
            _db.session.refresh(user)
            segundo_token = user.reset_token

        assert primer_token != segundo_token

    def test_ambos_emails_retornan_mismo_mensaje(self, client, db):
        """El mensaje de respuesta debe ser idéntico para emails existentes y no existentes."""
        user = make_user(username='mismo_msg', email='mismo@test.com')

        with patch('resend.Emails.send', return_value={'id': 'mock_id'}):
            rv_conocido = client.post(self.URL, json={'email': user.email})
        rv_desconocido = client.post(self.URL, json={'email': 'fantasma@test.com'})

        # Ambos deben retornar 200 y el mismo mensaje
        assert rv_conocido.status_code == 200
        assert rv_desconocido.status_code == 200
        assert rv_conocido.get_json()['message'] == rv_desconocido.get_json()['message']


# ═══════════════════════════════════════════════════════════════════════════════
# Restablecimiento de contraseña (reset-password)
# ═══════════════════════════════════════════════════════════════════════════════

class TestResetPassword:
    URL = '/api/auth/reset-password'

    def _configurar_token(self, user, minutos=60):
        """Asigna un token de reset válido (o expirado si minutos < 0)."""
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(minutes=minutos)
        _db.session.commit()
        return token

    def test_reset_exitoso_cambia_contrasena(self, client, db, user):
        token = self._configurar_token(user)
        rv = client.post(self.URL, json={
            'token': token, 'password': 'nueva_contraseña_123',
        })
        assert rv.status_code == 200
        assert 'message' in rv.get_json()

    def test_puede_iniciar_sesion_con_nueva_contrasena(self, client, db, user):
        token = self._configurar_token(user)
        client.post(self.URL, json={'token': token, 'password': 'mi_nueva_clave123'})

        rv_login = client.post('/api/auth/login', json={
            'email': user.email, 'password': 'mi_nueva_clave123',
        })
        assert rv_login.status_code == 200
        assert 'token' in rv_login.get_json()

    def test_contrasena_vieja_ya_no_funciona(self, client, db, user):
        token = self._configurar_token(user)
        client.post(self.URL, json={'token': token, 'password': 'nueva_clave456'})

        rv_vieja = client.post('/api/auth/login', json={
            'email': user.email, 'password': 'password123',  # contraseña original
        })
        assert rv_vieja.status_code == 401

    def test_token_invalido_retorna_error(self, client, db):
        rv = client.post(self.URL, json={
            'token': 'token_completamente_falso_xyz', 'password': 'nueva_clave789',
        })
        assert rv.status_code == 400
        msg = rv.get_json()['error'].lower()
        assert 'válido' in msg or 'expirado' in msg

    def test_token_expirado_retorna_error(self, client, db, user):
        token = self._configurar_token(user, minutos=-5)  # expirado hace 5 minutos
        rv = client.post(self.URL, json={
            'token': token, 'password': 'nueva_clave_expirada',
        })
        assert rv.status_code == 400
        msg = rv.get_json()['error'].lower()
        assert 'válido' in msg or 'expirado' in msg

    def test_token_usado_no_puede_reutilizarse(self, client, db, user):
        """Un token solo puede usarse una vez."""
        token = self._configurar_token(user)
        # Primer uso (exitoso)
        client.post(self.URL, json={'token': token, 'password': 'primera_nueva_123'})
        # Segundo uso (debe fallar)
        rv = client.post(self.URL, json={'token': token, 'password': 'segunda_nueva_456'})
        assert rv.status_code == 400

    def test_contrasena_corta_falla(self, client, db, user):
        token = self._configurar_token(user)
        rv = client.post(self.URL, json={'token': token, 'password': 'corta'})
        assert rv.status_code == 400
        assert '8' in rv.get_json()['error']

    def test_campos_faltantes_retorna_error(self, client, db):
        rv = client.post(self.URL, json={})
        assert rv.status_code == 400
        assert rv.get_json()['error']

    def test_reset_sin_token_retorna_error(self, client, db):
        rv = client.post(self.URL, json={'password': 'nueva_clave123'})
        assert rv.status_code == 400

    def test_reset_sin_contrasena_retorna_error(self, client, db, user):
        token = self._configurar_token(user)
        rv = client.post(self.URL, json={'token': token})
        assert rv.status_code == 400

    def test_reset_limpia_token_de_la_bd(self, client, db, user):
        """Después del reset, el token debe eliminarse de la base de datos."""
        token = self._configurar_token(user)
        client.post(self.URL, json={'token': token, 'password': 'nueva_clave_limpia'})
        _db.session.refresh(user)
        assert user.reset_token is None
        assert user.reset_token_expires is None
