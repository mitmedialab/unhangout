# Local development setup using docker-compose

The tl;dr version

Install docker and docker-compose. Then run

```
docker-compose -f docker/docker_compose_run.yml up unhangout
```

You will need to create database users and tables:

```
docker-compose -f docker/docker_compose_run.yml exec postgres psql -U postgres -c "create user reunhangout WITH PASSWORD 'password';"
docker-compose -f docker/docker_compose_run.yml exec postgres psql -U postgres -c "create database unhangout with owner unhangout";
```

Go to http://localhost:8000/ to access the application. You can access the maildev server at http://localhost:1080 to look at email activity.
