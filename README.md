# FUNAAB League V1

Virtual-coin football prediction platform for a school league.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT + bcrypt
- Deployment: Render

## Important
This V1 uses **virtual FUNAAB Coins only**. There are no real-money deposits, withdrawals, or cash prizes.

## Local setup
### Server
```bash
cd server
npm install
cp .env.example .env
# edit .env
npm run seed:admin
npm run dev
```

### Client
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

## Render
Create one Render Web Service for `server` and one Static Site for `client`.

Server build: `npm install`
Server start: `npm start`
Client build: `npm install && npm run build`
Client publish directory: `dist`

Set `CLIENT_URL` on the server to the deployed client URL and `VITE_API_URL` on the client to the server URL plus `/api`.
