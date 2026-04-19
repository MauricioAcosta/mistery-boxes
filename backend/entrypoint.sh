#!/bin/sh
set -e

echo "[entrypoint] Waiting for database..."

# Neon y otros proveedores cloud usan postgres:// o postgresql://
# y pueden incluir ?sslmode=require al final.
until python -c "
import os, psycopg2
url = os.environ['DATABASE_URL']
# Normaliza postgres:// → postgresql:// (psycopg2 acepta ambas pero por si acaso)
url = url.replace('postgres://', 'postgresql://', 1)
# Separa la query string antes de parsear
base = url.split('?')[0]
import re
m = re.match(r'postgresql://([^:]+):([^@]+)@([^:/]+):?(\d*)/(.+)', base)
if not m:
    raise ValueError(f'Cannot parse DATABASE_URL: {base}')
port = int(m.group(4)) if m.group(4) else 5432
# Pasa la URL completa para respetar sslmode y otros params
conn = psycopg2.connect(url)
conn.close()
" 2>/dev/null; do
  echo "[entrypoint] DB not ready, retrying in 2s..."
  sleep 2
done

echo "[entrypoint] DB ready. Initializing schema + seed..."
python - <<'PYEOF'
import os
from app import create_app
app = create_app(os.getenv('FLASK_ENV', 'production'))
with app.app_context():
    from app.extensions import db
    db.create_all()
    from app.seed import seed_demo_data
    try:
        seed_demo_data()
    except Exception as e:
        print(f"[entrypoint] Seed note: {e}")
print("[entrypoint] Schema ready.")
PYEOF

echo "[entrypoint] Starting gunicorn..."
# 2 workers para caber en 256 MB de RAM del free tier de Fly.io
exec gunicorn \
  --bind 0.0.0.0:5000 \
  --workers 2 \
  --timeout 120 \
  --access-logfile - \
  run:app
