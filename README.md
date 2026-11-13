# EduSphere – Online Learning Platform REST API

**Course:** CSC4161 – Advance Programming in Web Technology  
**Project Type:** Backend REST API  
**Framework:** NestJS with TypeScript  
**Database:** PostgreSQL  
**ORM:** TypeORM  

---

## 1. Project Overview

EduSphere is a role-based online learning platform developed as a backend REST API using NestJS, TypeScript, TypeORM, and PostgreSQL.

The platform provides a centralized system for managing courses, lessons, student enrollments, assignments, submissions, grading, teaching assistant activities, notifications, and user administration.

EduSphere implements four distinct user roles:

- **Admin:** Manages users, assigns teaching assistants, and oversees the platform.
- **Instructor:** Creates and manages courses, lessons, assignments, and evaluates student submissions.
- **Teaching Assistant (TA):** Assists instructors by reviewing submissions and providing grading recommendations.
- **Student:** Enrolls in courses, accesses lessons, submits assignments, and tracks academic progress.

The application follows a modular architecture with JWT-based authentication, role-based authorization, database transactions, input validation, and centralized exception handling.

The project is backend-focused. API endpoints can be accessed and tested using Swagger UI or Postman.

---

## 2. Key Features

### Authentication and Authorization
- User registration and login.
- JWT-based authentication.
- Password hashing using bcrypt.
- Role-based access control using guards.
- Protected API endpoints.
- Custom decorators for roles, public routes, and authenticated users.

### User Management
- User profile retrieval and updates.
- Administrator-controlled user management.
- Role assignment and account status management.

### Course Management
- Course creation and management.
- Course publishing and archiving.
- Course categorization.
- Course enrollment management.

### Lesson Management
- Create, update, retrieve, and delete lessons.
- Retrieve lessons associated with a course.
- Track student lesson completion.
- Monitor course progress.

### Assignment and Submission Management
- Create and manage assignments.
- Student assignment submissions.
- Instructor grading.
- Teaching assistant submission reviews.
- TA grading recommendations.

### Notification System
- User-specific notification retrieval.
- Email notifications for supported platform events.
- Notification status management.

### Audit Logging
- Records important system activities.
- Tracks the user responsible for changes.
- Stores entity information and change history.
- Records previous and updated values where supported.

### Additional Features
- Request ID middleware.
- HTTP request logging middleware.
- Response transformation interceptor.
- Request timing interceptor.
- Global exception filter.
- Environment variable validation.
- Database migrations.
- Transactional database operations.

---

## 3. Technology Stack

| Technology | Purpose |
|---|---|
| NestJS | Backend framework |
| TypeScript | Programming language |
| PostgreSQL | Relational database |
| TypeORM | ORM and database migrations |
| JWT | Authentication |
| Passport | Authentication strategy |
| bcrypt | Password hashing |
| class-validator | DTO validation |
| class-transformer | Data transformation |
| Joi | Environment validation |
| @nestjs/swagger | API documentation |
| Nodemailer | Email delivery |
| Jest | Unit and integration testing |
| Git & GitHub | Version control |
| Postman | API testing |

---

## 4. System Architecture

EduSphere follows a modular NestJS architecture. Each feature is organized into its own module, controller, service, entity, and DTOs where applicable.

### Project Structure

```text
edusphere/
│
├── src/
│   │
│   ├── admin/
│   ├── auth/
│   ├── assignments/
│   ├── audit-logs/
│   ├── categories/
│   ├── common/
│   │   ├── decorators/
│   │   ├── enums/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── middleware/
│   │
│   ├── config/
│   ├── courses/
│   ├── database/
│   │   ├── migrations/
│   │   ├── data-source.ts
│   │   └── seed-admin.ts
│   │
│   ├── enrollments/
│   ├── instructor/
│   ├── lessons/
│   ├── mail/
│   │   └── templates/
│   │
│   ├── notifications/
│   ├── submissions/
│   ├── teaching-assistant/
│   ├── users/
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── test/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

### Prerequisites

Install the following before running the project:

- Node.js
- npm
- PostgreSQL
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/KobiTalha/advanced-webtech-project.git
```

Navigate to the project directory:

```bash
cd advanced-webtech-project/edusphere
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file using the provided example:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure the required environment variables:

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_database_password
DB_NAME=edusphere_db

JWT_SECRET=your_secret_key_at_least_32_characters
JWT_EXPIRES_IN=15m

ADMIN_NAME=System Administrator
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password

MAIL_HOST=
MAIL_PORT=587
MAIL_USER=
MAIL_PASSWORD=
MAIL_FROM=
```

**Important:** Replace example values with your actual local configuration. Never commit `.env` or real credentials to GitHub.

### Step 4: Create the PostgreSQL Database

Create a database named:

```sql
CREATE DATABASE edusphere_db;
```

Ensure that the database credentials match your `.env` configuration.

### Step 5: Run Database Migrations

Build the database schema using the existing migration files:

```bash
npm run migration:run
```

To revert the most recent migration:

```bash
npm run migration:revert
```

### Step 6: Create the Initial Administrator

Configure the administrator information in `.env`, then execute:

```bash
npm run seed:admin
```

The seed script creates the initial administrator account.

### Step 7: Start the Application

Development mode:

```bash
npm run start:dev
```

Production mode:

```bash
npm run build
npm run start:prod
```

The API will be available at:

```text
http://localhost:3000/api
```

Swagger documentation:

```text
http://localhost:3000/api/docs
```

---
