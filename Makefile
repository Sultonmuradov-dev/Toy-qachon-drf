db:
	docker compose up -d database
run: db
	./manage.py runserver
mig:
	./manage.py makemigrations
	./manage.py migrate
up:
	docker compose up -d --build
down:
	docker compose down
logs:
	docker compose logs -f web
superuser:
	docker compose exec web python manage.py createsuperuser
# Eski db.sqlite3 dagi ma'lumotlarni PostgreSQL'ga ko'chirish (bir marta)
sqlite-to-pg: db
	./manage.py migrate
	./manage.py import_sqlite
