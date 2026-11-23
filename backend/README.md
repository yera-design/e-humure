# Backend setup

See the root `README.md` for complete installation, database migration, first administrator setup, facility network, and SMS simulator instructions.

The service requires `DATABASE_URL`, `JWT_SECRET`, `PHONE_KEY`, and `SETUP_SECRET` in `backend/.env`. Copy `backend/.env.example` to `.env`, set private values, then run `npm install`, `npm run seed`, and `npm start`. `npm test` runs every offline suite. The seed command verifies the database and does not insert a sample facility; enter your real facility during first administrator setup. Do not use demo credentials: demo staff and patient records are not seeded.