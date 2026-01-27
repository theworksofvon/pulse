.PHONY: dev build up down logs migrate studio clean

# Local development
dev:
	bun run index.ts

build:
	cd dashboard/pulse-dashboard && bun run build

up:
	docker compose up --build

down:
	docker compose down

# stop and remove volumes ( reset database )
down-v:
	docker compose down -v

logs:
	docker compose logs -f trace-service

migrate:
	bun run db:migrate

migrate-gen:
	bun run db:generate

migrate-push:
	bun run db:push

studio:
	bun run db:studio

install:
	bun install
	cd dashboard/pulse-dashboard && bun install

clean:
	rm -rf static
	rm -rf dashboard/pulse-dashboard/dist
