# Local development setup using docker-compose

The tl;dr version

Install docker and docker-compose. Then run

```
docker-compose build unhangout
```

Setup the database and run Django migrations:

```
docker-compose up -d postgres
docker-compose exec postgres psql -U postgres -c "create user unhangout WITH PASSWORD 'password';"
docker-compose exec postgres psql -U postgres -c "create database unhangout with owner unhangout";
docker-compose exec postgres psql -U postgres -c "create database test_unhangout with owner unhangout";
docker-compose run --rm unhangout /opt/app-venv/bin/python3 manage.py migrate
```

Start up the server

```
docker-compose up unhangout
```

Go to http://localhost:8000/ to access the application. You can access the maildev server at http://localhost:1080 to look at email activity.
