# Scholarship Application Portal

Full-stack scholarship portal with role-based workflows for **Student**, **Reviewer**, and **Admin**.

## Tech stack

- Backend: ASP.NET Core Web API (.NET 11), EF Core, SQLite, ASP.NET Identity, JWT
- Frontend: React + TypeScript + Vite
- Architecture: Domain / Application / Infrastructure / API layers

## Features

- Authentication with role-based access (`Student`, `Reviewer`, `Admin`)
- Scholarship CRUD and reviewer assignment (admin)
- Student application submission and supporting document uploads
- Reviewer queue and review scoring/comments
- Admin announcements and portal overview
- Ownership/authorization guards for student and reviewer actions

## Identity model

- `AppRole` remains generic for authorization role names.
- `AppUser` stores shared user data.
- Role-specific data is stored via one-to-one profiles:
  - `StudentProfile`
  - `ReviewerProfile`
  - `AdminProfile`

This keeps authorization concerns separate from role-specific business data.

## Project structure

- `backend/ScholarshipPortal.Api` — HTTP API controllers and startup
- `backend/ScholarshipPortal.Application` — use cases, DTOs, services
- `backend/ScholarshipPortal.Domain` — entities, enums, repository interfaces
- `backend/ScholarshipPortal.Infrastructure` — EF Core, Identity, repositories, storage
- `frontend/scholarship-portal-web` — React web client

## Run locally

### Backend

```bash
cd backend/ScholarshipPortal.Api
dotnet run --launch-profile http
```

Default URL: `http://localhost:5241`

If port `5241` is busy:

```bash
ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=http://127.0.0.1:5242 dotnet run --no-launch-profile
```

### Frontend

```bash
cd frontend/scholarship-portal-web
npm install
npm run dev
```

Default URL: `http://localhost:5173`

## Migrations

Create a migration:

```bash
dotnet ef migrations add <MigrationName> \
  --project backend/ScholarshipPortal.Infrastructure/ScholarshipPortal.Infrastructure.csproj \
  --startup-project backend/ScholarshipPortal.Api/ScholarshipPortal.Api.csproj \
  --output-dir Persistence/Migrations
```

Apply migrations at runtime through `AppDbInitializer.SeedAsync(...)` on API startup.

## Seeded users

- Student: `student@scholarship.local` / `Password123`
- Reviewer: `reviewer@scholarship.local` / `Password123`
- Admin: `admin@scholarship.local` / `Password123`

## API examples

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/overview`
- `GET /api/scholarships`
- `POST /api/applications`
- `POST /api/reviews`
