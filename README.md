Backend: Node.js + Express + Prisma + PostgreSQL
Frontend: Next.js (App Router)
Database: PostgreSQL via Docker
🚀 Project Setup Instructions
1. Start Database (Docker)
Install Docker Desktop
Navigate to the folder containing docker-compose.yml
Run:
docker compose up -d --build

This will start the PostgreSQL database.

2. Run Backend (API)
cd api
npm install

Then:

npx prisma migrate dev
npx prisma db seed
npm run dev

Backend will run at:

http://localhost:4000
3. Run Frontend (Web)
cd web
npm install
npm run dev

Frontend will run at:

http://localhost:3000