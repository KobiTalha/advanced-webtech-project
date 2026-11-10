# Advanced WebTech Project

EduSphere's minimal NestJS 12 starter, using Express and TypeScript 6.
It exposes `GET /`, which returns `Hello World!`. Feature modules, including
Admin, are not implemented. No database or `.env` file is required.

## Requirements

- Node.js 24.15 or newer within the 24.x release line
- npm

## Run locally

```sh
npm ci
npm run start:dev
```

Open `http://localhost:3000/`. The server uses the `PORT` environment variable
when provided; otherwise, it listens on port 3000.

## Build and verify

```sh
npm run build
npm run start:prod
```

Run checks separately from the server:

```sh
npm run lint
npm run format:check
npm test
npm run test:e2e
```

The starter changes are local and uncommitted on `admin`. The `main` branch
remains at the shared starting point.
