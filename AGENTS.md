# AGENTS.md

This guide is for agentic coding tools (Cursor, Copilot, etc.) working in **Blend-In**.

It summarizes commands, conventions, and where product intent lives.

## Framework note (Next.js)

This repo targets **Next.js 16** with the **App Router**. APIs and conventions may differ from older Next.js docs — verify against [`nextjs.org/docs`](https://nextjs.org/docs) and this repo’s patterns before assuming defaults.

---

## Project snapshot

- **Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript.
- **Formatting / lint:** Biome (`biome.json`).
- **E2E:** Playwright (`playwright.config.ts`, `tests/e2e/`).
- **Database:** PostgreSQL on Sliplane; schema via **Flyway** scripts in `migrations/` (not applied by the Next app in production).
- **Admin API auth (MVP):** `BLEND_ADMIN_SECRET` env + `Authorization: Bearer <secret>` on `/api/admin/**`.
- **Deploy:** Docker (`Dockerfile`, `output: "standalone"`).

Key HTTP routes live under `app/api/` (`admin/**`, `sessions/**`, `join/**`).

---

## Build, run, and test

Run from repository root (`blendIn/`).

### Development

```bash
npm install
npm run dev
```

### Production build

```bash
npm run build
npm run start
```

### Lint & format

```bash
npm run lint      # biome check .
npm run format    # biome format --write .
npm run check     # biome check --write .
```

### Integration tests (Vitest / Postgres)

```bash
npm test              # kjører `tests/**/*.test.ts` — DB-tester skipper uten DATABASE_URL
npm run test:watch    # vitest interactively
```

Når du vil verifisere migrasjon + seed: sett `DATABASE_URL`, kjør Flyway mot `migrations/`, kjør deretter `npm test`.

### End-to-end tests

```bash
npm run setup:playwright   # first-time Chromium download
npm run test:e2e           # starts dev server via playwright.config webServer
npm run test:e2e:ui        # interactive UI mode
```

### Docker

```bash
docker build -t blendIn .
docker run --rm -p 3000:3000 -e DATABASE_URL=... blendIn
```

Health check: `GET /api/health`.

### Deploy on Sliplane

Create a **Web** service from this repo’s `Dockerfile`. Set:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL URL (managed DB on Sliplane or external). |
| `NEXT_PUBLIC_APP_URL` | Public origin for presenter/mobile/new-hire URLs returned by admin APIs. |
| `BLEND_ADMIN_SECRET` | Bearer secret for `/api/admin/**`. |

Use **`GET /api/health`** as the platform HTTP health check.

The Next.js process **does not** run Flyway. Apply `migrations/` with Flyway against the target database before or alongside deploy (see **GitHub Actions** workflow `.github/workflows/ci.yml` for a CI example).

---

## Code style guidelines

Match existing files; Biome enforces formatting.

### TypeScript & React

- Strict typing; avoid `any` unless bridging untyped boundaries briefly.
- Prefer **functional components** and hooks.
- Server Components by default; add `"use client"` only when browser APIs or local state demand it.

### Naming

- **Variables / functions:** `camelCase`.
- **React components:** `PascalCase`.
- **New modules you add** under `lib/`, hooks, utils: prefer **`camelCase` filenames** (e.g. `sessionStore.ts`).
- **App Router files:** keep framework filenames **`page.tsx`**, **`layout.tsx`**, **`route.ts`**.
- **SQL (Flyway):** `snake_case` tables and columns.
- **npm package name:** `blendIn` (see `package.json`).

### Imports & structure

- Use the `@/*` path alias configured in `tsconfig.json`.
- Keep changes scoped; avoid drive-by refactors unrelated to the task.

### Environment & secrets

- Never commit `.env` or secrets. Commit **`.env.example`** only as a template.
- `DATABASE_URL` and similar belong in environment variables / Sliplane service config.

---

## Repository layout (high level)

| Path | Purpose |
|------|---------|
| `app/` | Routes, layouts, Server/Client Components, Route Handlers |
| `migrations/` | Flyway SQL (`V__*.sql`, repeatable `R__*.sql` when needed) |
| `tests/e2e/` | Playwright specs |
| `.cursor/TASKS.md` | Checkbox roadmap — **update tasks as work completes** |
| `.cursor/DESIGN.md` | UX/UI principles and tone |
| `Dockerfile` | Production container build |

---

## Product references for agents

When implementing features, align with:

- **`.cursor/TASKS.md`** — ordered backlog and done vs todo.
- **`.cursor/DESIGN.md`** — cozy tone, cup metaphor, harmony mechanic, tenant branding behavior.

---

## Cursor-specific files

- Rules may live under `.cursor/rules/` as `.mdc` files if added later.
- This **`AGENTS.md`** is the repo-level entry point for tooling.

---

## Practical tips

- After schema changes, add a **new Flyway version** under `migrations/` and mirror types in TypeScript/Drizzle when introduced.
- Prefer **SSE or polling** before adding Redis/WebSocket infra unless scale demands it (small teams).
- Update **`.cursor/TASKS.md`** checkboxes when you finish a task so humans and agents share the same progress picture.
