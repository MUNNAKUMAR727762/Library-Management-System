# Library Management System (Gyan Sthal)

Gyan Sthal Hub is a React + Spring Boot library management system for admissions, seat allocation, students, payments, notifications, exports, and QR-based public admission requests.

## Stack

- Frontend: Vite, React, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Spring Boot 3, Java 21, Maven
- Database: MongoDB Atlas
- File storage: MongoDB GridFS
- Auth: JWT in secure HTTP-only cookies

## Features

- Admin login with cookie-based authentication
- Shift and seat management with admission link generation
- Student admission, editing, seat transfer, and history tracking
- Monthly payment ledger with status automation
- Notifications for admissions, seat availability, and payment reminders
- Public QR admission form with image upload and compression
- CSV and JSON exports for students and payments
- MongoDB storage visibility for operations monitoring

## Project Structure

```text
.
├─ backend/                  # Spring Boot API
│  ├─ pom.xml
│  └─ src/main/java/com/gyansthal/backend
├─ src/                      # React frontend
├─ public/
├─ .env.example
├─ package.json
└─ README.md
```

## Requirements

- Node.js 18+
- Java 21
- Maven 3.9+
- MongoDB connection string

## Local Setup

1. Install frontend dependencies:

```bash
npm install
```

2. Create a local `.env` from `.env.example` and fill in your MongoDB values.

3. Start the backend:

```bash
npm run dev:api
```

The Spring Boot API runs on `http://localhost:5000`.

4. Start the frontend in another terminal:

```bash
npm run dev
```

The Vite frontend runs on `http://localhost:8080` and proxies `/api` requests to the Spring Boot backend.

## Environment Variables

Frontend:

- `VITE_API_BASE_URL`

Backend:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `JWT_SECRET`
- `JWT_COOKIE_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `APP_BASE_URL`
- `COOKIE_SECURE`
- `PHOTO_MAX_BYTES`
- `PHOTO_UPLOAD_MAX_BYTES`
- `ATLAS_STORAGE_LIMIT_BYTES`
- `ADMISSION_LINK_EXPIRES_IN_SECONDS`
- `REJECTED_PHOTO_RETENTION_DAYS`

## Backend Commands

```bash
npm run dev:api
npm run build:api
```

Or directly with Maven:

```bash
cd backend
mvn spring-boot:run
mvn clean package -DskipTests
```

## Deployment Notes

- The frontend can still be deployed to Vercel as a static build.
- The backend should be deployed separately as a Spring Boot service.
- In production, set `VITE_API_BASE_URL` to your deployed backend base path, for example `https://your-backend.example.com/api`.
- Set `APP_BASE_URL` to the public frontend URL so admission links point to the correct site.
- Set `COOKIE_SECURE=true` in production.

## Default Admin

If no admin user exists, the backend creates one automatically using:

- Email: value of `ADMIN_EMAIL`
- Password: `admin1234` when `ADMIN_PASSWORD_HASH` is empty

Change that immediately in production by seeding a hashed password through `ADMIN_PASSWORD_HASH`.

## API Surface

The Spring Boot backend keeps the same `/api` contract used by the frontend, including:

- `/api/auth/*`
- `/api/settings`
- `/api/dashboard/*`
- `/api/seats/*`
- `/api/students/*`
- `/api/payments/*`
- `/api/notifications/*`
- `/api/admission-requests/*`
- `/api/public/admission-form`
- `/api/public/admission-requests`
- `/api/files/{fileId}`

 
