#!/bin/sh
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# DJANGO_SUPERUSER_* berilgan bo'lsa admin yaratiladi (bor bo'lsa o'tkazib yuboriladi)
if [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    python manage.py createsuperuser --noinput 2>/dev/null || true
fi

exec "$@"
