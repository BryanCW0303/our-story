#!/bin/sh
# Start the site on this computer at http://127.0.0.1:8010
# Usage: ./start.sh          (set PORT=xxxx to use another port)
set -e
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if [ ! -d backend/.venv ]; then
  python3 -m venv backend/.venv
  backend/.venv/bin/pip install -q -r backend/requirements.txt
fi

if [ ! -d frontend/dist ]; then
  (cd frontend && npm install && npm run build)
fi

cd backend
.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py collectstatic --noinput >/dev/null

# Only listens on this computer; the Cloudflare Tunnel is what makes it public.
# Threaded workers: a photo coming in over a slow connection can take minutes, and must neither
# be cut off by the worker timeout nor keep everyone else waiting.
exec .venv/bin/gunicorn config.wsgi \
  --bind "127.0.0.1:${PORT:-8010}" --workers 2 --worker-class gthread --threads 4 --timeout 120 \
  --access-logfile -
