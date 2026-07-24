.PHONY: up down logs shell-api shell-client db-reset db-migrate db-seed test

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

shell-api:
	docker compose exec api sh

shell-client:
	docker compose exec client sh

db-reset:
	docker compose exec api sh -c "export DATABASE_URL=\$$MIGRATE_DATABASE_URL && npx prisma migrate reset --force"

db-migrate:
	docker compose exec api sh -c "export DATABASE_URL=\$$MIGRATE_DATABASE_URL && npx prisma migrate dev"

db-seed:
	docker compose exec api sh -c "export DATABASE_URL=\$$MIGRATE_DATABASE_URL && npx prisma db seed"

test:
	docker compose exec api npm test

test-client:
	docker compose exec client npm test
