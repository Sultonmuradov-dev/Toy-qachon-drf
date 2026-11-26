run:
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
