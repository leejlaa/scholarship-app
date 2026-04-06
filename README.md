# Scholarship Management Portal Starter

This workspace now includes a practical starter for a **Scholarship Management Portal** using **ASP.NET Core Web API** and **React + Vite**.

## ✅ What is included

- `backend/ScholarshipPortal.Api` — minimal ASP.NET API with seeded endpoints for:
  - scholarship postings
  - applications and status tracking
  - reviewer queue with scores and comments
  - admin announcements and workflow steps
- `frontend/scholarship-portal-web` — React dashboard with role-based views for:
  - **Student**
  - **Reviewer**
  - **Admin**

## 🧱 Recommended production architecture

| Layer | Recommended choice |
| --- | --- |
| Frontend | React + TypeScript + Vite |
| Backend | ASP.NET Core Web API |
| Auth | ASP.NET Identity + JWT |
| Database | SQL Server + Entity Framework Core |
| File Uploads | Azure Blob Storage or local storage for development |
| Notifications | Email service (SendGrid / SMTP) |

## 📌 Core modules to build next

1. **Authentication & Roles**
   - Student, Reviewer, Admin login
   - role-based authorization

2. **Scholarship Management**
   - create/edit/archive scholarships
   - deadlines, eligibility criteria, award amount

3. **Application Workflow**
   - student form submission
   - required document upload
   - automatic completeness and eligibility checks

4. **Review & Scoring**
   - assign reviewers
   - scoring rubric
   - reviewer comments and recommendations

5. **Decision & Results**
   - approve/reject/waitlist applications
   - publish results
   - notify students

## 🗃️ Suggested database tables

- `Users`
- `Roles`
- `Scholarships`
- `Applications`
- `ApplicationDocuments`
- `EligibilityRules`
- `Reviews`
- `Announcements`
- `Results`
- `AuditLogs`

## ▶️ Run locally

### Backend
```bash
cd backend/ScholarshipPortal.Api
dotnet run --launch-profile http
```
API base URL: `http://localhost:5241`

### Frontend
```bash
cd frontend/scholarship-portal-web
npm run dev
```
App URL: `http://localhost:5173`

## 🧪 Useful starter endpoints

- `GET /api/health`
- `GET /api/overview`
- `GET /api/scholarships`
- `GET /api/applications`
- `GET /api/reviewer/queue`
- `GET /api/announcements`
- `GET /api/workflow`

## 🚀 Suggested next implementation steps

- replace seeded demo data with EF Core models and SQL Server
- add ASP.NET Identity and JWT authentication
- build real file upload endpoints
- add validation, pagination, and audit logs
- write API and UI tests before expanding workflow logic
# scholarship-app
