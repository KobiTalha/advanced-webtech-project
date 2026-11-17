# EduSphere API

EduSphere is a role-based REST API for an online learning platform. It uses NestJS, TypeORM, and PostgreSQL to manage users, courses, lessons, enrollments, assignments, submissions, notifications, and audit history.

## Requirements

- Node.js 20.19+ or 22.12+
- PostgreSQL 14+
- npm

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a PostgreSQL database, then copy `.env.example` to `.env` and set the database credentials and a JWT secret of at least 32 characters. SMTP settings are optional for local development; configure them to deliver email through an SMTP sandbox or mail provider.

3. Build the schema from the versioned migrations:

   ```bash
   npm run migration:run
   ```

4. Optionally create the initial administrator by setting `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.env`, then running:

   ```bash
   npm run seed:admin
   ```

5. Start the API:

   ```bash
   npm run start:dev
   ```

The API listens at `http://localhost:3000/api`. Interactive Swagger documentation is at `http://localhost:3000/api/docs`.

## Configuration

Configuration is loaded from `.env` through `@nestjs/config` and validated at startup with Joi. `.env.example` lists the supported settings. Do not commit `.env` or real credentials.

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port (default `3000`) |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection |
| `JWT_SECRET` | Signing key; minimum 32 characters |
| `JWT_EXPIRES_IN` | Access-token lifetime (default `15m`) |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM` | SMTP delivery settings |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Optional seed administrator |

TypeORM schema synchronization is disabled. Apply schema changes with migrations and use `npm run migration:revert` to revert the latest migration.

## API areas

- Authentication: registration and login return JWT bearer tokens.
- Users, categories, courses, lessons, assignments, and enrollments: role-controlled resource operations.
- Submissions: student submission, instructor grading, and teaching-assistant recommendations.
- Notifications: per-user delivery history.
- Audit logs: administrator-only, filterable change history.

Protected routes require `Authorization: Bearer <token>`. The roles are `ADMIN`, `INSTRUCTOR`, `TA`, and `STUDENT`. List endpoints support `page` and `limit` pagination where applicable.

## Project requirements implemented

- DTO validation and a consistent HTTP error format.
- PostgreSQL relations, migrations, and transactional enrollment and grading workflows with row locks.
- Request ID and request logging middleware; role and current-user decorators; timing, response, and audit interceptors.
- SMTP email notifications using HTML templates in `src/mail/templates`.
- Audit records include the actor, entity, old and new values, request IP, and timestamp.

## Commands

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
npm run migration:run
npm run migration:revert
```

The Jest unit and end-to-end tests use the scripts above. Set `NODE_ENV=test` and provide test database settings before running database-dependent checks.

## Role workflows

Administrators manage users, categories and TA assignments. Only instructors publish courses and final grades. TAs can read courses, lessons and assignments only for courses to which they are assigned; their recommendations remain internal to course staff. Students see final instructor marks and feedback.

| Method and route (under `/api`) | Access and purpose |
| --- | --- |
| `PATCH /courses/:id/instructor` | Admin transfers the course to an active instructor; body: `{ "instructor_id": "uuid" }` |
| `GET /courses`, `GET /courses/:id` | TAs can discover and read only assigned courses |
| `GET /courses/:courseId/lessons`, `GET /lessons/:id` | Assigned TAs can read lesson content |
| `GET /courses/:courseId/assignments`, `GET /assignments/:id` | Assigned TAs can read assignment instructions and maximum marks |
| `GET /courses/:courseId/students/:studentId/progress` | Owning instructor or admin reads a student's lesson progress |
| `GET /teaching-assistant/submissions/:submissionId/reviews` | Assigned TA, owning instructor or admin reads the full review history |
| `PATCH /submissions/:id` | Student replaces their own unreviewed submission before the deadline; body: `{ "submission_url": "https://example.com/work" }` |
| `POST /auth/forgot-password` | Public; body: `{ "email": "student@example.com" }`; generic response, reset token sent only by email |
| `POST /auth/reset-password` | Public; body: `{ "token": "token-from-email", "password": "new-password" }`; resets password and invalidates previous login tokens |

Transfer or archive an instructor's non-archived courses before deactivating them or changing their role. Transfers preserve lessons, assignments, student enrollments, grades and review history.

`COMPLETED` enrollment records mean all lessons were marked complete, not that the student has passed every assignment. Both active and completed students may submit work until the deadline in a published course. Completing a lesson is idempotent. Submission replacement is blocked after any TA review or final grade, preserving the meaning of existing feedback. Maximum marks are fixed once the first submission exists; other assignment details remain editable. TA recommendations cannot change after an instructor has finalized the grade. Submission creation, replacement and grading record audit history in their database transaction.

### Password recovery setup

Run `npm run migration:run` before starting the updated application. The `AddPasswordRecovery1794910000000` migration adds a password-reset table and a user token version. Configure SMTP to receive recovery emails; no reset token is returned in API responses or stored in plaintext. Tokens expire after 15 minutes and are consumed once. Recovery endpoints allow five requests per IP per minute, with a one-minute email cooldown per account. The built-in rate-limit store is per application instance; a multi-instance deployment needs shared rate-limit storage.

Existing version-zero access tokens continue to work until expiry unless the user's password is reset. A successful reset invalidates older token versions immediately. Database migration and SMTP delivery must be verified in the target environment.

### Database and API regression checks

`npm run test:workflows` builds the application, creates a disposable database on the configured local PostgreSQL server, applies all migrations and exercises the role workflows through HTTP. It verifies a deliberate transaction rollback and captures emails locally without sending them. The database login needs permission to create databases. The test database is deleted afterward; the configured project database receives no test fixtures.
