# Despliegue en Producción — MysteryBoxes

Stack: **Flask + PostgreSQL + React**  
Infraestructura: **Fly.io + Neon + Vercel** — costo $0/mes

---

## URLs de Producción

| Servicio | URL |
|---|---|
| Frontend | https://mysteriesboxes.com |
| Frontend (www) | https://www.mysteriesboxes.com |
| Backend API | https://api.mysteriesboxes.com |
| Backend (Fly fallback) | https://mistery-boxes-backend.fly.dev |
| Panel Admin | https://mysteriesboxes.com/admin |
| Monitoreo Fly.io | https://fly.io/apps/mistery-boxes-backend/monitoring |
| Consola Neon | https://console.neon.tech/app/projects/small-union-65234467 |

---

## Credenciales

### Admin de la plataforma
```
Email:    admin@mysteryboxes.com
Password: Admin123!
Rol:      super_admin
```

### Base de datos — Neon PostgreSQL
```
Host:        ep-nameless-dream-am07pzx6-pooler.c-5.us-east-1.aws.neon.tech
Database:    neondb
Usuario:     neondb_owner
Password:    npg_jo9SXzNky2PE
Puerto:      5432
SSL:         require

Connection string:
postgresql://neondb_owner:npg_jo9SXzNky2PE@ep-nameless-dream-am07pzx6-pooler.c-5.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
```

### Backend — Fly.io secrets
```
SECRET_KEY:     25374414f48cab46bece4baaae70d09f5675a260bfa023d1bddd6f407140ec66
JWT_SECRET_KEY: 5d7bd1fb8a663124334b81eb6ab54d9409d8350eaed2527a62b88df42e94325d
FLASK_ENV:      production
RESEND_API_KEY: (ver sección Resend más abajo)
MAIL_FROM:      Mystery Boxes <noreply@mysteryboxes.com>
FRONTEND_URL:   https://frontend-eight-zeta-74.vercel.app
```

### Resend — Email transaccional
```
Cuenta:   amacostapulido@gmail.com
Plan:     Free (3 000 correos/mes, 100/día)
Dashboard: https://resend.com/emails
Dominio:  onboarding@resend.dev (sandbox — solo envía al correo del dueño de la cuenta)
API Key:  re_Gqdamypp_74SDgbsWa8Rdmzg7rTWJgFo7
```

> **Nota sobre el dominio sandbox:** En el plan free de Resend, el sender debe ser
> `onboarding@resend.dev` a menos que verifiques un dominio propio. Los correos
> llegarán correctamente, pero el remitente visible será `onboarding@resend.dev`.
> Para usar `noreply@mysteryboxes.com` se requiere verificar el dominio en Resend DNS.

### Cuentas de los servicios
```
Fly.io:  amacostapulido@gmail.com
Neon:    amacostapulido@gmail.com  — proyecto: mistery-boxes (small-union-65234467)
Vercel:  mauricioacosta             — proyecto: frontend
GoDaddy: amacostapulido@gmail.com  — dominio: mysteriesboxes.com
```

---

## DNS — GoDaddy (mysteriesboxes.com)

Configurar estos registros en https://dcc.godaddy.com/manage/mysteriesboxes.com/dns

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | @ | 76.76.21.21 | 600 |
| A | www | 76.76.21.21 | 600 |
| A | api | 66.241.125.115 | 600 |
| AAAA | api | 2a09:8280:1::106:cb34:0 | 600 |

> **Nota:** Los registros A de `@` y `www` apuntan a Vercel (frontend).
> Los registros de `api` apuntan a Fly.io (backend).
> La propagación DNS puede tardar entre 15 minutos y 48 horas.

---

## Arquitectura del despliegue

```
Usuario
  │
  ▼
Vercel (CDN global)
  React SPA — npm run build → dist/
  │
  │  VITE_API_BASE_URL → https://mistery-boxes-backend.fly.dev
  │
  ▼
Fly.io — mistery-boxes-backend (Dallas dfw)
  Docker container — python:3.11-slim
  Gunicorn 2 workers — puerto 5000
  256 MB RAM — shared CPU — nunca duerme
  │
  │  DATABASE_URL (sslmode=require)
  │
  ▼
Neon PostgreSQL (us-east-1)
  neondb — 512 MB free tier
  Tablas: users, products, boxes, box_items,
          box_openings, wallets, transactions,
          user_seeds, platform_config
```

---

## Cómo se desplegó cada componente

### 1. Neon — Base de datos

Neon ya tenía el proyecto creado desde la consola web. Se obtuvo la connection string con el MCP de Neon directamente desde Claude Code.

La base de datos se inicializa automáticamente al arrancar el backend: el `entrypoint.sh` corre `db.create_all()` y `seed_demo_data()` en el primer inicio.

**Tablas creadas automáticamente al primer deploy.**

---

### 2. Fly.io — Backend Flask

**Instalación del CLI:**
```bash
curl -L https://fly.io/install.sh | sh
export PATH="$HOME/.fly/bin:$PATH"
fly auth login   # ya autenticado con amacostapulido@gmail.com
```

**Crear la app:**
```bash
cd backend/
fly apps create mistery-boxes-backend
```

**Cargar secrets (variables de entorno privadas):**
```bash
fly secrets set \
  DATABASE_URL="postgresql://neondb_owner:npg_jo9SXzNky2PE@ep-nameless-dream-am07pzx6-pooler.c-5.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require" \
  SECRET_KEY="25374414f48cab46bece4baaae70d09f5675a260bfa023d1bddd6f407140ec66" \
  JWT_SECRET_KEY="5d7bd1fb8a663124334b81eb6ab54d9409d8350eaed2527a62b88df42e94325d" \
  FLASK_ENV="production"
```

**Desplegar:**
```bash
fly deploy --wait-timeout 120
```

Fly.io construye la imagen Docker (`backend/Dockerfile`), la sube a su registry y levanta la máquina en Dallas. El `entrypoint.sh` espera la DB, crea tablas y arranca Gunicorn.

**Archivo de configuración:** [`backend/fly.toml`](backend/fly.toml)

```toml
app            = "mistery-boxes-backend"
primary_region = "dfw"   # Dallas — más cercano a Colombia

[http_service]
  internal_port        = 5000
  force_https          = true
  auto_stop_machines   = false   # nunca duerme
  min_machines_running = 1

[[vm]]
  cpu_kind = "shared"
  cpus     = 1
  memory   = "256mb"
```

> **Nota:** La región `mia` (Miami) está deprecada en Fly.io. Se usa `dfw` (Dallas).

---

### 3. Vercel — Frontend React

**CLI ya instalado globalmente:** `npx vercel`

**Desplegar:**
```bash
cd mistery-boxes/   # raíz del repo (NO entrar a frontend/)
npx vercel --prod
```

Vercel detecta automáticamente que es un proyecto Vite, instala dependencias, corre `npm run build` y publica el `dist/` en su CDN global.

> **Nota:** El proyecto tiene `rootDirectory = frontend` configurado en Vercel.
> El `.vercel/project.json` de la raíz está en `.gitignore`. Al clonar en una nueva máquina,
> correr `npx vercel link` desde la raíz para regenerarlo antes del primer deploy manual.

**Variable de entorno** apuntando al backend de Fly.io:
```bash
echo "https://mistery-boxes-backend.fly.dev" | npx vercel env add VITE_API_BASE_URL production
npx vercel --prod --yes   # redesplegar con la variable activa
```

**Archivo de configuración:** [`frontend/vercel.json`](frontend/vercel.json)

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

El rewrite es necesario para que React Router maneje las rutas en el cliente (sin él, `/admin` daría 404).

---

## Actualizar en producción

### Cambios en el backend
```bash
cd backend/
fly deploy
```

### Cambios en el frontend
```bash
cd mistery-boxes/   # raíz del repo (NO entrar a frontend/)
npx vercel --prod
```

### Ver logs del backend en tiempo real
```bash
fly logs --app mistery-boxes-backend
```

### Estado de las máquinas
```bash
fly status --app mistery-boxes-backend
fly machine list --app mistery-boxes-backend
```

### Escalar (si hay más carga)
```bash
fly scale count 2 --app mistery-boxes-backend   # 2 máquinas
fly scale memory 512 --app mistery-boxes-backend # más RAM
```

---

## Solución de problemas frecuentes

| Problema | Causa | Solución |
|---|---|---|
| Backend devuelve 503 | Health check fallando | `fly deploy` para forzar reinicio |
| `postgres://` en DATABASE_URL | Neon usa prefijo distinto | `config.py` normaliza automáticamente |
| Frontend no llama al API | `VITE_API_BASE_URL` no definida | Revisar variables en Vercel dashboard |
| Ruta `/admin` da 404 | React Router necesita catch-all | Ya resuelto en `vercel.json` |
| Región `mia` deprecada | Fly.io deprecó Miami | Usar `dfw` (Dallas) |

---

## Costos actuales

| Servicio | Plan | Costo |
|---|---|---|
| Vercel | Hobby (free) | $0 |
| Fly.io | Free tier (1 máquina shared) | $0 |
| Neon | Free tier (512 MB) | $0 |
| **Total** | | **$0/mes** |

Los tres servicios requieren tarjeta de crédito registrada pero no cobran mientras se mantenga dentro del free tier.
