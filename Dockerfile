FROM python:3.14-alpine

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Avval faqat req.txt — kod o'zgarganda paketlar qayta o'rnatilmaydi (tez build)
COPY req.txt .
RUN pip install -r req.txt

COPY . .
# Windows'da git CRLF qilib yuborsa ham skript ishlashi uchun
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "root.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
