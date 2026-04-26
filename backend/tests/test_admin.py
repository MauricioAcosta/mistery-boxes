"""Pruebas de integración para /api/admin/* — gestión de la plataforma.

Cubre:
- Control de acceso (usuario normal, admin_provider, super_admin)
- CRUD de productos y cajas
- Gestión de usuarios y administradores
- Estadísticas de la plataforma
- Configuración del margen y house-edge
"""
import pytest
from app.extensions import db as _db
from app.models import User, Wallet, Product, Box, BoxItem
from app.services.provably_fair import ProvablyFairService
from tests.conftest import auth_header, login, make_user, make_box


# ── Helpers de fixtures ───────────────────────────────────────────────────────

def make_super_admin(username='superadmin', email='super@example.com', password='admin1234'):
    user = User(username=username, email=email, role='super_admin')
    user.set_password(password)
    _db.session.add(user)
    _db.session.add(Wallet(user=user))
    _db.session.flush()
    ProvablyFairService.create_seed_pair(user.id)
    _db.session.commit()
    return user


def make_admin_provider(username='adminprov', email='prov@example.com',
                        password='admin1234', client_id='techclient'):
    user = User(username=username, email=email,
                role='admin_provider', provider_client_id=client_id)
    user.set_password(password)
    _db.session.add(user)
    _db.session.add(Wallet(user=user))
    _db.session.flush()
    ProvablyFairService.create_seed_pair(user.id)
    _db.session.commit()
    return user


@pytest.fixture
def super_admin(db):
    return make_super_admin()


@pytest.fixture
def super_token(client, super_admin):
    return login(client, super_admin.email, 'admin1234')


@pytest.fixture
def admin_prov(db):
    return make_admin_provider()


@pytest.fixture
def admin_prov_token(client, admin_prov):
    return login(client, admin_prov.email, 'admin1234')


# ═══════════════════════════════════════════════════════════════════════════════
# Control de acceso
# ═══════════════════════════════════════════════════════════════════════════════

class TestControlAcceso:
    """Verificar que los endpoints protegidos rechazan accesos no autorizados."""

    def test_usuario_normal_no_puede_listar_productos(self, client, db, user, user_token):
        rv = client.get('/api/admin/products', headers=auth_header(user_token))
        assert rv.status_code == 403
        assert 'administrador' in rv.get_json()['error'].lower()

    def test_usuario_normal_no_puede_ver_lista_de_usuarios(self, client, db, user, user_token):
        rv = client.get('/api/admin/users', headers=auth_header(user_token))
        assert rv.status_code == 403

    def test_usuario_normal_no_puede_ver_estadisticas(self, client, db, user, user_token):
        rv = client.get('/api/admin/stats', headers=auth_header(user_token))
        assert rv.status_code == 403

    def test_sin_token_retorna_401_en_productos(self, client, db):
        rv = client.get('/api/admin/products')
        assert rv.status_code == 401

    def test_sin_token_retorna_401_en_cajas(self, client, db):
        rv = client.get('/api/admin/boxes')
        assert rv.status_code == 401

    def test_admin_proveedor_no_puede_ver_usuarios(self, client, db, admin_prov, admin_prov_token):
        """admin_provider no tiene acceso a rutas exclusivas de super_admin."""
        rv = client.get('/api/admin/users', headers=auth_header(admin_prov_token))
        assert rv.status_code == 403
        assert 'super' in rv.get_json()['error'].lower()

    def test_admin_proveedor_no_puede_ver_configuracion(self, client, db, admin_prov, admin_prov_token):
        rv = client.get('/api/admin/config', headers=auth_header(admin_prov_token))
        assert rv.status_code == 403

    def test_admin_proveedor_puede_listar_productos(self, client, db, admin_prov, admin_prov_token):
        rv = client.get('/api/admin/products', headers=auth_header(admin_prov_token))
        assert rv.status_code == 200

    def test_admin_proveedor_puede_ver_estadisticas(self, client, db, admin_prov, admin_prov_token):
        rv = client.get('/api/admin/stats', headers=auth_header(admin_prov_token))
        assert rv.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
# Gestión de usuarios (super_admin only)
# ═══════════════════════════════════════════════════════════════════════════════

class TestGestionUsuarios:

    def test_listar_usuarios_exitoso(self, client, db, super_admin, super_token, user):
        rv = client.get('/api/admin/users', headers=auth_header(super_token))
        assert rv.status_code == 200
        data = rv.get_json()
        assert 'users' in data
        assert 'total' in data
        assert data['total'] >= 2   # al menos super_admin + user fixture

    def test_listar_usuarios_paginacion(self, client, db, super_admin, super_token):
        rv = client.get('/api/admin/users', query_string={'page': 1, 'per_page': 5},
                        headers=auth_header(super_token))
        data = rv.get_json()
        assert 'pages' in data
        assert 'current_page' in data
        assert data['current_page'] == 1

    def test_buscar_usuario_por_nombre(self, client, db, super_admin, super_token, user):
        rv = client.get('/api/admin/users', query_string={'q': user.username},
                        headers=auth_header(super_token))
        data = rv.get_json()
        assert data['total'] >= 1
        assert any(user.username in u['username'] for u in data['users'])

    def test_buscar_usuario_por_email(self, client, db, super_admin, super_token, user):
        rv = client.get('/api/admin/users', query_string={'q': user.email},
                        headers=auth_header(super_token))
        data = rv.get_json()
        assert data['total'] >= 1

    def test_busqueda_sin_resultados(self, client, db, super_admin, super_token):
        rv = client.get('/api/admin/users', query_string={'q': 'zzz_no_existe_zzz'},
                        headers=auth_header(super_token))
        assert rv.get_json()['total'] == 0

    def test_crear_admin_proveedor_exitoso(self, client, db, super_admin, super_token):
        rv = client.post('/api/admin/admins', json={
            'username': 'nuevo_admin',
            'email': 'nuevo@ejemplo.com',
            'password': 'adminpass1',
            'provider_client_id': 'cliente_x',
        }, headers=auth_header(super_token))
        assert rv.status_code == 201
        data = rv.get_json()
        assert data['role'] == 'admin_provider'
        assert data['provider_client_id'] == 'cliente_x'
        assert 'password_hash' not in data  # no exponer el hash

    def test_crear_admin_sin_campos_requeridos(self, client, db, super_admin, super_token):
        rv = client.post('/api/admin/admins', json={'username': 'incompleto'},
                         headers=auth_header(super_token))
        assert rv.status_code == 400
        msg = rv.get_json()['error'].lower()
        assert 'faltan' in msg or 'campo' in msg

    def test_crear_admin_contrasena_corta(self, client, db, super_admin, super_token):
        rv = client.post('/api/admin/admins', json={
            'username': 'newadm', 'email': 'adm@x.com',
            'password': '123', 'provider_client_id': 'cx',
        }, headers=auth_header(super_token))
        assert rv.status_code == 400
        assert '8' in rv.get_json()['error']

    def test_crear_admin_email_duplicado(self, client, db, super_admin, super_token, user):
        rv = client.post('/api/admin/admins', json={
            'username': 'otro_nombre', 'email': user.email,
            'password': 'password123', 'provider_client_id': 'cx',
        }, headers=auth_header(super_token))
        assert rv.status_code == 409
        assert 'correo' in rv.get_json()['error'].lower()

    def test_crear_admin_usuario_duplicado(self, client, db, super_admin, super_token, user):
        rv = client.post('/api/admin/admins', json={
            'username': user.username, 'email': 'nuevo@correo.com',
            'password': 'password123', 'provider_client_id': 'cx',
        }, headers=auth_header(super_token))
        assert rv.status_code == 409
        assert 'usuario' in rv.get_json()['error'].lower()


# ═══════════════════════════════════════════════════════════════════════════════
# CRUD de Productos
# ═══════════════════════════════════════════════════════════════════════════════

class TestProductos:
    DATOS_PRODUCTO = {
        'name': 'Smartphone XYZ',
        'retail_value': 299.99,
        'brand': 'TechBrand',
        'category': 'electronica',
        'rarity': 'rare',
        'description': 'Un teléfono de alta gama',
        'image_url': 'https://example.com/phone.jpg',
    }

    def test_listar_productos(self, client, db, super_admin, super_token):
        rv = client.get('/api/admin/products', headers=auth_header(super_token))
        assert rv.status_code == 200
        assert isinstance(rv.get_json(), list)

    def test_crear_producto_exitoso(self, client, db, super_admin, super_token):
        rv = client.post('/api/admin/products', json=self.DATOS_PRODUCTO,
                         headers=auth_header(super_token))
        assert rv.status_code == 201
        data = rv.get_json()
        assert data['name'] == 'Smartphone XYZ'
        assert float(data['retail_value']) == pytest.approx(299.99)
        assert data['rarity'] == 'rare'
        assert data['brand'] == 'TechBrand'

    def test_crear_producto_sin_nombre_falla(self, client, db, super_admin, super_token):
        rv = client.post('/api/admin/products',
                         json={'retail_value': 100.0},
                         headers=auth_header(super_token))
        assert rv.status_code == 400
        msg = rv.get_json()['error'].lower()
        assert 'nombre' in msg or 'obligatorio' in msg

    def test_crear_producto_sin_valor_falla(self, client, db, super_admin, super_token):
        rv = client.post('/api/admin/products',
                         json={'name': 'Sin Precio'},
                         headers=auth_header(super_token))
        assert rv.status_code == 400

    def test_actualizar_producto_exitoso(self, client, db, super_admin, super_token):
        rv = client.post('/api/admin/products', json=self.DATOS_PRODUCTO,
                         headers=auth_header(super_token))
        product_id = rv.get_json()['id']

        rv2 = client.patch(f'/api/admin/products/{product_id}',
                           json={'name': 'Smartphone XYZ Pro', 'retail_value': 399.99},
                           headers=auth_header(super_token))
        assert rv2.status_code == 200
        data = rv2.get_json()
        assert data['name'] == 'Smartphone XYZ Pro'
        assert float(data['retail_value']) == pytest.approx(399.99)

    def test_actualizar_producto_inexistente(self, client, db, super_admin, super_token):
        rv = client.patch('/api/admin/products/999999',
                          json={'name': 'No Existe'},
                          headers=auth_header(super_token))
        assert rv.status_code == 404

    def test_admin_proveedor_no_modifica_producto_ajeno(
            self, client, db, super_admin, super_token, admin_prov, admin_prov_token):
        """admin_provider no puede modificar productos que no son suyos."""
        rv = client.post('/api/admin/products',
                         json={**self.DATOS_PRODUCTO, 'client_id': 'default'},
                         headers=auth_header(super_token))
        product_id = rv.get_json()['id']

        rv2 = client.patch(f'/api/admin/products/{product_id}',
                           json={'name': 'Intento no autorizado'},
                           headers=auth_header(admin_prov_token))
        assert rv2.status_code == 403
        assert 'denegado' in rv2.get_json()['error'].lower()

    def test_admin_proveedor_crea_producto_propio(self, client, db, admin_prov, admin_prov_token):
        rv = client.post('/api/admin/products', json={
            'name': 'Producto Proveedor', 'retail_value': 50.00,
        }, headers=auth_header(admin_prov_token))
        assert rv.status_code == 201
        # El client_id debe ser el del proveedor automáticamente
        assert rv.get_json()['client_id'] == admin_prov.provider_client_id

    def test_admin_proveedor_solo_ve_sus_productos(
            self, client, db, super_admin, super_token, admin_prov, admin_prov_token):
        # super_admin crea un producto con client_id='default'
        client.post('/api/admin/products',
                    json={**self.DATOS_PRODUCTO, 'client_id': 'default'},
                    headers=auth_header(super_token))
        # admin_prov crea su propio producto
        client.post('/api/admin/products',
                    json={'name': 'Solo mio', 'retail_value': 20.00},
                    headers=auth_header(admin_prov_token))

        rv = client.get('/api/admin/products', headers=auth_header(admin_prov_token))
        products = rv.get_json()
        # Solo debe ver sus propios productos
        assert all(p['client_id'] == admin_prov.provider_client_id for p in products)


# ═══════════════════════════════════════════════════════════════════════════════
# CRUD de Cajas
# ═══════════════════════════════════════════════════════════════════════════════

class TestCajas:
    def _crear_producto(self, client, token):
        rv = client.post('/api/admin/products', json={
            'name': 'Premio Test', 'retail_value': 50.00,
            'brand': 'Brand', 'rarity': 'common',
        }, headers=auth_header(token))
        assert rv.status_code == 201
        return rv.get_json()['id']

    def test_listar_cajas_como_admin(self, client, db, super_admin, super_token, box):
        rv = client.get('/api/admin/boxes', headers=auth_header(super_token))
        assert rv.status_code == 200
        data = rv.get_json()
        assert isinstance(data, list)
        assert any(b['id'] == box.id for b in data)

    def test_crear_caja_con_items(self, client, db, super_admin, super_token):
        product_id = self._crear_producto(client, super_token)
        rv = client.post('/api/admin/boxes', json={
            'name': 'Caja Premium',
            'price': 20.00,
            'category': 'tech',
            'description': 'Caja de tecnología premium',
            'items': [{'product_id': product_id, 'weight': 100}],
        }, headers=auth_header(super_token))
        assert rv.status_code == 201
        data = rv.get_json()
        assert data['name'] == 'Caja Premium'
        assert float(data['price']) == pytest.approx(20.00)
        assert len(data['items']) == 1

    def test_crear_caja_sin_nombre_falla(self, client, db, super_admin, super_token):
        rv = client.post('/api/admin/boxes', json={'price': 10.00},
                         headers=auth_header(super_token))
        assert rv.status_code == 400
        msg = rv.get_json()['error'].lower()
        assert 'nombre' in msg or 'obligatorio' in msg

    def test_crear_caja_sin_precio_falla(self, client, db, super_admin, super_token):
        rv = client.post('/api/admin/boxes', json={'name': 'Sin Precio'},
                         headers=auth_header(super_token))
        assert rv.status_code == 400

    def test_crear_caja_sin_items(self, client, db, super_admin, super_token):
        rv = client.post('/api/admin/boxes', json={
            'name': 'Caja Vacía', 'price': 5.00,
        }, headers=auth_header(super_token))
        # Se puede crear sin items, pero no se podrá abrir
        assert rv.status_code == 201

    def test_actualizar_caja_nombre_y_precio(self, client, db, super_admin, super_token, box):
        rv = client.patch(f'/api/admin/boxes/{box.id}',
                          json={'name': 'Caja Actualizada', 'price': 25.00},
                          headers=auth_header(super_token))
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['name'] == 'Caja Actualizada'
        assert float(data['price']) == pytest.approx(25.00)

    def test_activar_y_desactivar_caja(self, client, db, super_admin, super_token, box):
        estado_original = box.is_active
        rv = client.patch(f'/api/admin/boxes/{box.id}/toggle',
                          headers=auth_header(super_token))
        assert rv.status_code == 200
        assert rv.get_json()['is_active'] != estado_original

        # Volver al estado original
        rv2 = client.patch(f'/api/admin/boxes/{box.id}/toggle',
                           headers=auth_header(super_token))
        assert rv2.get_json()['is_active'] == estado_original

    def test_caja_desactivada_no_visible_en_lista_publica(
            self, client, db, super_admin, super_token, box):
        client.patch(f'/api/admin/boxes/{box.id}/toggle',
                     headers=auth_header(super_token))
        rv = client.get('/api/boxes')
        ids_publicos = [b['id'] for b in rv.get_json()]
        assert box.id not in ids_publicos

    def test_caja_desactivada_no_se_puede_abrir(
            self, client, db, super_admin, super_token, funded_user, funded_token, box):
        client.patch(f'/api/admin/boxes/{box.id}/toggle', headers=auth_header(super_token))
        rv = client.post(f'/api/boxes/{box.id}/open', headers=auth_header(funded_token))
        assert rv.status_code == 404

    def test_admin_proveedor_no_modifica_caja_ajena(
            self, client, db, admin_prov, admin_prov_token, box):
        rv = client.patch(f'/api/admin/boxes/{box.id}',
                          json={'price': 999.00},
                          headers=auth_header(admin_prov_token))
        assert rv.status_code == 403
        assert 'denegado' in rv.get_json()['error'].lower()

    def test_actualizar_items_de_caja(self, client, db, super_admin, super_token, box):
        """Reemplazar los items de una caja existente."""
        nuevo_producto_rv = client.post('/api/admin/products', json={
            'name': 'Nuevo Premio', 'retail_value': 75.00, 'rarity': 'epic',
        }, headers=auth_header(super_token))
        nuevo_producto_id = nuevo_producto_rv.get_json()['id']

        rv = client.patch(f'/api/admin/boxes/{box.id}',
                          json={'items': [{'product_id': nuevo_producto_id, 'weight': 100}]},
                          headers=auth_header(super_token))
        assert rv.status_code == 200
        items = rv.get_json()['items']
        assert len(items) == 1
        assert items[0]['product']['id'] == nuevo_producto_id


# ═══════════════════════════════════════════════════════════════════════════════
# Estadísticas de la plataforma
# ═══════════════════════════════════════════════════════════════════════════════

class TestEstadisticas:

    def test_estadisticas_estructura_correcta(self, client, db, super_admin, super_token):
        rv = client.get('/api/admin/stats', headers=auth_header(super_token))
        assert rv.status_code == 200
        data = rv.get_json()
        campos_esperados = [
            'total_users', 'total_openings', 'total_revenue',
            'total_exchanged', 'gross_profit', 'actual_margin_pct',
            'target_margin_pct', 'margin_strength',
        ]
        for campo in campos_esperados:
            assert campo in data, f"Falta el campo '{campo}' en las estadísticas"

    def test_estadisticas_iniciales_sin_actividad(self, client, db, super_admin, super_token):
        rv = client.get('/api/admin/stats', headers=auth_header(super_token))
        data = rv.get_json()
        assert data['total_openings'] == 0
        assert data['total_revenue'] == pytest.approx(0.0)
        assert data['gross_profit'] == pytest.approx(0.0)

    def test_estadisticas_reflejan_apertura(self, client, db, super_admin, super_token,
                                            funded_user, funded_token, box):
        rv_antes = client.get('/api/admin/stats', headers=auth_header(super_token))
        aperturas_antes = rv_antes.get_json()['total_openings']
        ingresos_antes = rv_antes.get_json()['total_revenue']

        client.post(f'/api/boxes/{box.id}/open', headers=auth_header(funded_token))

        rv_despues = client.get('/api/admin/stats', headers=auth_header(super_token))
        data = rv_despues.get_json()
        assert data['total_openings'] == aperturas_antes + 1
        assert data['total_revenue'] > ingresos_antes

    def test_estadisticas_reflejan_canje(self, client, db, super_admin, super_token,
                                         funded_user, funded_token, box):
        open_rv = client.post(f'/api/boxes/{box.id}/open', headers=auth_header(funded_token))
        opening_id = open_rv.get_json()['opening_id']
        client.post('/api/exchange', json={'opening_id': opening_id},
                    headers=auth_header(funded_token))

        rv = client.get('/api/admin/stats', headers=auth_header(super_token))
        assert rv.get_json()['total_exchanged'] > 0

    def test_estadisticas_requiere_admin(self, client, db, user, user_token):
        rv = client.get('/api/admin/stats', headers=auth_header(user_token))
        assert rv.status_code == 403
        assert 'administrador' in rv.get_json()['error'].lower()


# ═══════════════════════════════════════════════════════════════════════════════
# Configuración de la plataforma
# ═══════════════════════════════════════════════════════════════════════════════

class TestConfiguracion:

    def test_obtener_configuracion(self, client, db, super_admin, super_token):
        rv = client.get('/api/admin/config', headers=auth_header(super_token))
        assert rv.status_code == 200
        data = rv.get_json()
        assert 'house_edge_pct' in data
        assert 'margin_strength' in data

    def test_actualizar_margen_valido(self, client, db, super_admin, super_token):
        rv = client.patch('/api/admin/config',
                          json={'house_edge_pct': 25.0},
                          headers=auth_header(super_token))
        assert rv.status_code == 200
        assert rv.get_json()['house_edge_pct'] == pytest.approx(25.0)

    def test_actualizar_intensidad_valida(self, client, db, super_admin, super_token):
        rv = client.patch('/api/admin/config',
                          json={'margin_strength': 0.5},
                          headers=auth_header(super_token))
        assert rv.status_code == 200
        assert rv.get_json()['margin_strength'] == pytest.approx(0.5)

    def test_actualizar_ambas_claves_a_la_vez(self, client, db, super_admin, super_token):
        rv = client.patch('/api/admin/config',
                          json={'house_edge_pct': 35.0, 'margin_strength': 0.8},
                          headers=auth_header(super_token))
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['house_edge_pct'] == pytest.approx(35.0)
        assert data['margin_strength'] == pytest.approx(0.8)

    def test_margen_por_debajo_del_minimo_falla(self, client, db, super_admin, super_token):
        rv = client.patch('/api/admin/config',
                          json={'house_edge_pct': 0.5},
                          headers=auth_header(super_token))
        assert rv.status_code == 400
        msg = rv.get_json()['error'].lower()
        assert 'margen' in msg or 'plataforma' in msg

    def test_margen_por_encima_del_maximo_falla(self, client, db, super_admin, super_token):
        rv = client.patch('/api/admin/config',
                          json={'house_edge_pct': 75.0},
                          headers=auth_header(super_token))
        assert rv.status_code == 400

    def test_intensidad_negativa_falla(self, client, db, super_admin, super_token):
        rv = client.patch('/api/admin/config',
                          json={'margin_strength': -0.1},
                          headers=auth_header(super_token))
        assert rv.status_code == 400
        assert 'intensidad' in rv.get_json()['error'].lower()

    def test_intensidad_mayor_a_uno_falla(self, client, db, super_admin, super_token):
        rv = client.patch('/api/admin/config',
                          json={'margin_strength': 1.5},
                          headers=auth_header(super_token))
        assert rv.status_code == 400

    def test_clave_desconocida_falla(self, client, db, super_admin, super_token):
        rv = client.patch('/api/admin/config',
                          json={'clave_inventada': 99},
                          headers=auth_header(super_token))
        assert rv.status_code == 400

    def test_configuracion_requiere_super_admin(self, client, db, admin_prov, admin_prov_token):
        rv = client.get('/api/admin/config', headers=auth_header(admin_prov_token))
        assert rv.status_code == 403

    def test_actualizar_configuracion_requiere_super_admin(
            self, client, db, admin_prov, admin_prov_token):
        rv = client.patch('/api/admin/config',
                          json={'house_edge_pct': 20.0},
                          headers=auth_header(admin_prov_token))
        assert rv.status_code == 403
