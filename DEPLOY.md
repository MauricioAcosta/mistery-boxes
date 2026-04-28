# Despliegue en Producción — MysteryBoxes

Stack: **Flask + PostgreSQL + React**  
Infraestructura: **Fly.io + Neon + Vercel** — costo $0/mes

---

## ⚡ Referencia Rápida — Subir Cambios

> Copia y pega según lo que hayas modificado.

### Cambié solo el frontend (CSS, imágenes, componentes React)

```bash
cd /home/andy/work/mistery-boxes

git add frontend/
git commit -m "descripción del cambio"
git push origin master
# Vercel despliega automáticamente en 1-2 minutos
```

### Cambié solo el backend (rutas Flask, modelos, config)

```bash
cd /home/andy/work/mistery-boxes

git add backend/
git commit -m "descripción del cambio"
git push origin master

cd backend/
fly deploy
# Esperar: "v(N) deployed successfully" — toma 2-3 minutos
```

### Cambié frontend Y backend

```bash
cd /home/andy/work/mistery-boxes

git add frontend/ backend/
git commit -m "descripción del cambio"
git push origin master
# → Vercel despliega el frontend automáticamente

cd backend/
fly deploy
# → Fly.io despliega el backend manualmente
```

### La base de datos (Neon) no requiere despliegue

Las tablas se crean automáticamente al arrancar el backend. Si necesitas ejecutar una consulta directa ve a la consola: https://console.neon.tech/app/projects/small-union-65234467

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
| Dashboard Vercel | https://vercel.com/dashboard |

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
RESEND_API_KEY: re_Gqdamypp_74SDgbsWa8Rdmzg7rTWJgFo7
MAIL_FROM:      Mystery Boxes <noreply@mysteryboxes.com>
FRONTEND_URL:   https://frontend-eight-zeta-74.vercel.app
```

### Resend — Email transaccional
```
Cuenta:    amacostapulido@gmail.com
Plan:      Free (3 000 correos/mes, 100/día)
Dashboard: https://resend.com/emails
API Key:   re_Gqdamypp_74SDgbsWa8Rdmzg7rTWJgFo7
Dominio:   onboarding@resend.dev (sandbox — solo envía al dueño de la cuenta)
```

> En el plan free de Resend el remitente visible es `onboarding@resend.dev`.
> Para usar `noreply@mysteryboxes.com` hay que verificar el dominio en el panel de Resend.

### Cuentas de los servicios
```
Fly.io:  amacostapulido@gmail.com
Neon:    amacostapulido@gmail.com  — proyecto: mistery-boxes (small-union-65234467)
Vercel:  mauricioacosta             — proyecto: frontend
GoDaddy: amacostapulido@gmail.com  — dominio: mysteriesboxes.com
GitHub:  MauricioAcosta             — repo: mistery-boxes
```

---

## DNS — GoDaddy (mysteriesboxes.com)

Configurar en https://dcc.godaddy.com/manage/mysteriesboxes.com/dns

| Tipo  | Nombre | Valor                       | TTL |
|-------|--------|-----------------------------|-----|
| A     | @      | 76.76.21.21                 | 600 |
| A     | www    | 76.76.21.21                 | 600 |
| A     | api    | 66.241.125.115              | 600 |
| AAAA  | api    | 2a09:8280:1::106:cb34:0     | 600 |

> `@` y `www` apuntan a Vercel (frontend). `api` apunta a Fly.io (backend).
> La propagación DNS puede tardar entre 15 min y 48 horas.

---

## Arquitectura del despliegue

```
Usuario
  │
  ▼
Vercel (CDN global)
  React SPA — npm run build → dist/
  │
  │  VITE_API_BASE_URL → https://api.mysteriesboxes.com
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

## Primer despliegue (solo si es una máquina nueva)

### Neon — Base de datos
Las tablas se crean automáticamente al primer arranque del backend. No requiere acción manual.

### Fly.io — Backend Flask

```bash
# Instalar CLI
curl -L https://fly.io/install.sh | sh
export PATH="$HOME/.fly/bin:$PATH"
fly auth login   # usar amacostapulido@gmail.com

# Crear la app (solo una vez)
cd backend/
fly apps create mistery-boxes-backend

# Cargar variables de entorno
fly secrets set \
  DATABASE_URL="postgresql://neondb_owner:npg_jo9SXzNky2PE@ep-nameless-dream-am07pzx6-pooler.c-5.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require" \
  SECRET_KEY="25374414f48cab46bece4baaae70d09f5675a260bfa023d1bddd6f407140ec66" \
  JWT_SECRET_KEY="5d7bd1fb8a663124334b81eb6ab54d9409d8350eaed2527a62b88df42e94325d" \
  FLASK_ENV="production"

# Desplegar
fly deploy --wait-timeout 120
```

### Vercel — Frontend React

```bash
# Desde la raíz del repo (NO entrar a frontend/)
cd /home/andy/work/mistery-boxes
npx vercel link      # vincular proyecto (solo primera vez)
npx vercel --prod
```

> Si clonas el repo en una máquina nueva, corre `npx vercel link` antes del primer deploy.

---

## Comandos útiles

### Ver logs del backend en tiempo real
```bash
fly logs --app mistery-boxes-backend
```

### Estado de las máquinas
```bash
fly status --app mistery-boxes-backend
fly machine list --app mistery-boxes-backend
```

### Reiniciar el backend sin redesplegar
```bash
fly machine restart --app mistery-boxes-backend
```

### Escalar si hay más carga
```bash
fly scale count 2 --app mistery-boxes-backend    # 2 máquinas
fly scale memory 512 --app mistery-boxes-backend # más RAM
```

### Ejecutar una consulta SQL directa en Neon
Ir a: https://console.neon.tech/app/projects/small-union-65234467 → SQL Editor

---

## Solución de problemas frecuentes

| Problema | Causa | Solución |
|---|---|---|
| Backend devuelve 503 | Health check fallando | `fly deploy` para forzar reinicio |
| Cajas no cargan / error 500 | Neon cierra conexiones inactivas | Ya resuelto con `pool_pre_ping` en `config.py` |
| `postgres://` en DATABASE_URL | Neon usa prefijo distinto a SQLAlchemy | `config.py` normaliza automáticamente |
| Frontend no llama al API | `VITE_API_BASE_URL` no definida en Vercel | Revisar variables en Vercel dashboard |
| Ruta `/admin` da 404 | React Router necesita catch-all | Ya resuelto en `vercel.json` |
| Región `mia` deprecada | Fly.io deprecó Miami | Usar `dfw` (Dallas) |
| Build de Vercel falla | Error en el código JS/CSS | Ver log en vercel.com/dashboard |

---

## Costos actuales

| Servicio | Plan | Costo |
|---|---|---|
| Vercel | Hobby (free) | $0 |
| Fly.io | Free tier (1 máquina shared) | $0 |
| Neon | Free tier (512 MB) | $0 |
| GoDaddy | Dominio mysteriesboxes.com | ~$15/año |
| **Total** | | **~$1.25/mes** |
