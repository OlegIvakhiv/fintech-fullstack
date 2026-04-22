# Investment Platform

A full-stack investment management system where investors can deposit funds, invest in business units, track earnings, and request withdrawals — while admins manage users, business units, set monthly ROI, and approve withdrawal requests.

## Tech Stack

### Backend (`/fintech-core`)
- **Framework**: NestJS
- **ORM**: Prisma
- **Database**: PostgreSQL (running in Docker)
- **Auth**: JWT + Passport
- **Validation**: class-validator & TypeScript

### Frontend (`/frontend`)
- **Framework**: Next.js (App Router)
- **State Management**: TanStack Query (React Query)
- **UI Components**: shadcn/ui & Tailwind CSS

---

## Getting Started

### Prerequisites
- Node.js v18+
- Docker
- npm

---

### 1. Clone the repository

```bash
git clone https://github.com/------/-----.git
cd your-repo
```

---

### 2. Start the database

```bash
docker compose up -d
```

This starts a PostgreSQL container on port `5432` and pgAdmin on `http://localhost:5080`.

pgAdmin credentials:
- **Email**: admin@admin.com
- **Password**: admin

---

### 3. Backend setup

```bash
cd fintech-core
npm install
```

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Your `.env` should look like this:

```env
DATABASE_URL="postgresql://postgres:secret@localhost:5432/fintech_db?schema=public"
JWT_SECRET="your-strong-secret-here"
PORT=3001
```

Run database migrations:

```bash
npx prisma migrate deploy
npx prisma generate
```

Start the backend:

```bash
npm run start:dev
```

The API will be available at `http://localhost:3001`.

---

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

---

### 5. Create your first admin user

The database starts empty. Use Prisma Studio to create an admin account:

```bash
cd backend
npx prisma studio
```

Open `http://localhost:5555`, go to the `User` table, and insert a row with:
- `email` — your login email
- `password` — a **bcrypt-hashed** password (use [bcrypt.online](https://bcrypt.online) to generate one)
- `role` — `ADMIN`

---

## Project Structure

```
/
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── accounts/
│   │   ├── portfolios/
│   │   ├── business-units/
│   │   ├── transactions/
│   │   ├── withdrawal-requests/
│   │   ├── exchange/
│   │   ├── funds/
│   │   └── dashboard/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── docker-compose.yml
│   └── .env.example
│
└── frontend/
    ├── app/
    └── components/
```

---

## Notes

- Exchange rates are fetched live from the **National Bank of Ukraine (NBU)** public API — no API key required, but an internet connection is needed. Rates are cached for 5 minutes.
- JWT tokens expire after **1 day**.
- The frontend API URL (`http://localhost:3001`) is hardcoded — no frontend `.env` file is needed.
- in file local_acciunts.md you can find an admin and investor users examples.