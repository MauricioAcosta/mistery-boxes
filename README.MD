# Mystery Boxes 🎁

Plataforma de cajas misteriosas con apertura provablemente justa. Los usuarios compran cajas, ven una animación cinematográfica del unboxing, y reciben un producto real seleccionado criptográficamente.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite, React Router v6 |
| Backend | Python 3.11, Flask 3, Flask-JWT-Extended |
| Base de datos | PostgreSQL 16 |
| Proxy | Nginx 1.27 |
| Orquestación | Docker Compose |

---

## Requisitos previos

- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/) v2 (incluido en Docker Desktop)
- `git`

---

## Desarrollo local

### 1. Clonar y configurar variables de entorno

```bash
git clone <repo-url>
cd mistery-boxes

cp .env.example .env
```

El archivo `.env` ya tiene valores funcionales para desarrollo. No necesitas cambiarlo para arrancar.

### 2. Levantar los servicios

```bash
docker compose up --build
```

Esto levanta cuatro contenedores:

| Contenedor | Puerto local | Descripción |
|---|---|---|
| `mb_db` | — | PostgreSQL |
| `mb_backend` | — | Flask API (interno) |
| `mb_frontend` | — | Vite dev server (interno) |
| `mb_nginx` | **80** | Proxy → frontend + `/api/*` |

La aplicación queda disponible en `http://localhost`.

El backend espera automáticamente a que la base de datos esté lista, crea el esquema y siembra datos de demostración en el primer arranque.

### 3. Ver los logs en tiempo real

**Todos los servicios a la vez** (recomendado para desarrollo):

```bash
docker compose up --build
```

Cuando arrancas sin `-d` el log de todos los contenedores sale en la terminal con prefijos de color, por ejemplo:

```
mb_backend  | [entrypoint] Waiting for database...
mb_backend  | [entrypoint] DB ready. Initializing schema + seed...
mb_backend  | [entrypoint] Starting gunicorn...
mb_frontend | VITE v5.x.x  ready in 300 ms  ➜  http://localhost:5173/
mb_nginx    | /docker-entrypoint.sh: Configuration complete
```

**Solo un servicio** (en otra terminal mientras el resto ya corre):

```bash
docker compose logs -f backend    # logs del backend en vivo
docker compose logs -f frontend   # logs del frontend (HMR, errores de build)
docker compose logs -f db         # logs de PostgreSQL
docker compose logs -f nginx      # logs de acceso HTTP
```

**Ver las últimas N líneas** (sin seguir en vivo):

```bash
docker compose logs --tail 50 backend
```

**Entrar a la shell de un contenedor** para depurar:

```bash
docker compose exec backend bash     # shell del backend (Python disponible)
docker compose exec frontend sh      # shell del frontend (Node disponible)
docker compose exec db psql -U mbuser -d mysteryboxes   # consola de PostgreSQL
```

**Ver el estado de todos los contenedores**:

```bash
docker compose ps
```

Salida esperada cuando todo está bien:

```
NAME           STATUS          PORTS
mb_db          Up (healthy)
mb_backend     Up (healthy)
mb_frontend    Up
mb_nginx       Up              0.0.0.0:80->80/tcp
```

### 4. Reiniciar tras cambios de código

El servidor de Vite recarga el frontend automáticamente (HMR) — no hace falta reiniciar nada al editar archivos `.jsx` / `.css`.

Para el backend, reinicia el contenedor tras cambiar código Python:

```bash
docker compose restart backend
```

Para reconstruir imágenes tras cambios en `requirements.txt` o `package.json`:

```bash
docker compose up --build
```

### 5. Apagar

```bash
docker compose down          # conserva la base de datos
docker compose down -v       # borra también el volumen de PostgreSQL (reset total)
```

---

## Ejecutar pruebas

### Backend (pytest)

```bash
# Desde el host, usando el venv del proyecto
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pytest
```

O desde dentro del contenedor:

```bash
docker compose exec backend pytest
```

Las pruebas usan SQLite en memoria — no necesitan PostgreSQL.

### Frontend (Vitest)

```bash
cd frontend
npm install
npm test           # ejecución única
npm run test:watch # modo watch
```

O desde dentro del contenedor:

```bash
docker compose exec frontend npm test
```

---

## Configuración de cliente / tema

El frontend soporta múltiples marcas. El cliente se configura con la variable `VITE_CLIENT_ID`.

| `VITE_CLIENT_ID` | Marca | Color primario |
|---|---|---|
| `default` | Mystery Boxes | Púrpura `#7c3aed` |
| `xiaomi` | Xiaomi | Naranja `#FF6900` |
| `oppo` | OPPO | Azul `#1D8DDB` |
| `motorola` | Motorola | Marino `#0066CC` |
| `samsung` | Samsung | Azul oscuro `#1428A0` |
| `realme` | realme | Dorado `#FFD700` |

Para cambiar el tema en desarrollo, edita el archivo `frontend/.env`:

```env
VITE_CLIENT_ID=xiaomi
```

Y reinicia el contenedor del frontend:

```bash
docker compose restart frontend
```

---

## Despliegue en producción

### 1. Servidor requerido

Cualquier VPS con:
- Ubuntu 22.04 / Debian 12 (recomendado)
- 1 GB RAM mínimo (2 GB recomendado)
- Docker y Docker Compose instalados
- Puerto 80 y 443 abiertos en el firewall

### 2. Clonar el repositorio en el servidor

```bash
git clone <repo-url> /opt/mistery-boxes
cd /opt/mistery-boxes
```

### 3. Crear el archivo `.env` de producción

```bash
cp .env.example .env
nano .env
```

Configuración mínima para producción:

```env
# Base de datos
POSTGRES_DB=mysteryboxes
POSTGRES_USER=mbuser
POSTGRES_PASSWORD=<contraseña-segura>

# Flask
FLASK_ENV=production
SECRET_KEY=<genera-con-comando-abajo>
JWT_SECRET_KEY=<genera-con-comando-abajo>

# Nginx
NGINX_PORT=80
```

Genera las claves secretas:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
# ejecuta dos veces: una para SECRET_KEY, otra para JWT_SECRET_KEY
```

### 4. Configurar el tema del cliente (opcional)

Crea o edita `frontend/.env`:

```env
VITE_CLIENT_ID=xiaomi          # branding del cliente
VITE_SHOW_THEME_SWITCHER=false # ocultar selector de tema en producción
```

### 5. Construir y levantar en producción

```bash
docker compose up --build -d
```

La aplicación queda disponible en `http://<ip-del-servidor>`.

Verifica que todo está corriendo:

```bash
docker compose ps
docker compose logs backend --tail 30
```

### 6. HTTPS con Let's Encrypt (recomendado)

Instala Certbot y el plugin de Nginx en el servidor:

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d tudominio.com
```

Luego actualiza `nginx/nginx.conf` para escuchar en 443 con los certificados generados por Certbot y redirigir el tráfico HTTP → HTTPS.

### 7. Actualizar la aplicación

```bash
cd /opt/mistery-boxes
git pull
docker compose up --build -d
```

---

## Variables de entorno — referencia completa

### `.env` (raíz del proyecto)

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `POSTGRES_DB` | Nombre de la base de datos | `mysteryboxes` |
| `POSTGRES_USER` | Usuario de PostgreSQL | `mbuser` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | `changeme_in_production` |
| `DATABASE_URL` | URL completa (auto-construida en compose) | — |
| `FLASK_ENV` | Entorno Flask (`development` / `production`) | `development` |
| `SECRET_KEY` | Clave secreta de Flask | — |
| `JWT_SECRET_KEY` | Clave para firmar tokens JWT | — |
| `NGINX_PORT` | Puerto externo de Nginx | `80` |

### `frontend/.env`

| Variable | Descripción | Valores |
|---|---|---|
| `VITE_CLIENT_ID` | Tema / cliente activo | `default`, `xiaomi`, `oppo`, `motorola`, `samsung`, `realme` |
| `VITE_SHOW_THEME_SWITCHER` | Mostrar selector de tema en producción | `true` / `false` |
| `VITE_API_BASE_URL` | URL base de la API | `/api` |

---

## Estructura del proyecto

```
mistery-boxes/
├── backend/
│   ├── app/
│   │   ├── models/        # Modelos SQLAlchemy
│   │   ├── routes/        # Blueprints de Flask
│   │   ├── services/      # Lógica de negocio (provably fair, wallet, etc.)
│   │   └── config.py
│   ├── tests/             # Pruebas con pytest (83 tests)
│   ├── Dockerfile
│   ├── entrypoint.sh      # Espera DB → migra schema → inicia gunicorn
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # BoxOpenScene, PrizeModal, Navbar, etc.
│   │   ├── pages/         # Home, BoxDetail, Login, Wallet, History, Verify
│   │   ├── i18n/          # Traducciones ES / EN
│   │   ├── themes/        # Paletas de color por cliente
│   │   └── context/       # ThemeContext, I18nContext
│   ├── src/__tests__/     # Pruebas con Vitest (34 tests)
│   └── Dockerfile
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
└── .env.example
```
