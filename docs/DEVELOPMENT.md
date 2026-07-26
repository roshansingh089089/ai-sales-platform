# Development

Copy `.env.example` to `.env`, run `docker compose up -d`, then run `./mvnw spring-boot:run -Dspring-boot.run.profiles=local` in `backend`. In `frontend`, copy `.env.example` to `.env.local`, run `npm install`, then `npm run dev`.

Quality checks: `./mvnw spotless:check test` and `npm run lint && npm run build`.

Manual verification should create a business, contact, and opportunity; generate/edit/ready a brief; request manual-call preparation; record an interested outcome; then confirm the task and dashboard update. Repeat with `DO_NOT_CONTACT` and confirm that manual-call preparation is denied.
