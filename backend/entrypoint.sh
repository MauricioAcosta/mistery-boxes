#!/bin/sh
set -e

echo "[entrypoint] Waiting for database..."
until python -c "
import os, psycopg2
url = os.environ['DATABASE_URL']
# parse: postgresql://user:pass@host:port/db
import re
m = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', url)
conn = psycopg2.connect(host=m.group(3), port=int(m.group(4)),
    user=m.group(1), password=m.group(2), dbname=m.group(5))
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
exec gunicorn --bind 0.0.0.0:5000 --workers 4 --timeout 120 run:app
