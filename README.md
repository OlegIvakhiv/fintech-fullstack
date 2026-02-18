# Fintech Ledger System

A full-stack Double-Entry Bookkeeping application built with **NestJS**, **Next.js**, and **PostgreSQL**. 

## Tech Stack

### Backend (`/fintech-core`)
- **Framework**: NestJS
- **ORM**: Prisma
- **Database**: PostgreSQL (Running in Docker)
- **Validation**: Class-validator & TypeScript

### Frontend (`/frontend`)
- **Framework**: Next.js (App Router)
- **State Management**: TanStack Query (React Query)
- **UI Components**: shadcn/ui & Tailwind CSS

##  Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Docker
- npm 

### 2. Database Setup
Run the PostgreSQL container using Docker:
bash docker run --name fintech-db -e POSTGRES_PASSWORD=secret -d -p 5432:5432 postgres

### 3. Backend Setup
- Bash
- cd fintech-core
- npm install
- Configure your .env with: DATABASE_URL="postgresql://postgres:secret@localhost:5432/postgres"
- npx prisma migrate dev
- npm run start:dev

### 4. Frontend Setup
- Bash
- cd fintech-ui
- npm install
- npm run dev

