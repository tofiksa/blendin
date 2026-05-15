# Blend-In — task checklist

Track implementation progress here. Checked items below are backed by **`npm run lint`**, **`npm run build`**, **`npm test`** (Vitest), and **`npm run test:e2e`** (Playwright) being green — **Vitest schema/seed asserts require Postgres + Flyway** (see under *Database verification*).

---

## Baseline repo

- [x] Project scaffold — Next.js 16 App Router + Tailwind (`blendIn/`).
- [x] Naming & branding — product **Blend-In**, npm package **`blendIn`**, Norwegian landing copy.
- [x] Warm default theme — CSS variables in `app/globals.css`.
- [x] Health endpoint — `GET /api/health` (**Playwright:** `tests/e2e/health.spec.ts`; database status via `@/lib/getDatabaseStatus`).
- [x] Docker / Sliplane — `Dockerfile`, standalone output, `.dockerignore`.
- [x] Env template — `.env.example` (`DATABASE_URL`, `NEXT_PUBLIC_APP_URL`).
- [x] Flyway folder — `migrations/` (V1 tenant → V8 seeded questions).
- [x] Tooling — Biome, Playwright, Vitest (`.cursor/TASKS.md` / `vitest.config.ts`).
- [x] Git — repository initialized locally (`git init`).

---

### Database verification (Vitest integration)

Vitest skips DB tests **when `DATABASE_URL` is unset** (still green CI).  
To validate schema + seeds locally:

```bash
docker compose up -d
export DATABASE_URL=postgresql://blend:blend@localhost:5432/blendin
# Apply Flyway (CLI installert): JDBC_URL=jdbc:postgresql://localhost:5432/blendin
flyway -locations=filesystem:migrations migrate
npm test   # kjører bl.a. SELECT 1 + demo-tenant + 10 spørsmål
```

---

## Database (`migrations/` + Flyway)

- [x] **V2 — Quiz content** — `quiz_template`, `quiz_template_version`, `question`, `question_option`.
- [x] **V3 — Sessions & state** — `quiz_session` + enums + updated_at trigger (**DB-test:** tables etter migrate).
- [x] **V4 — New hire** — `new_hire_answer` + `confidence_band`.
- [x] **V5 — Team / magic links** — `join_token`, `team_attempt`, `team_attempt_answer`.
- [x] **V6 — Aggregates** — `session_question_result` (counts JSON, ties, chosen option).
- [x] **Seed data** — `V7__seed_demo_tenant_and_quiz.sql`, `V8__seed_quiz_questions.sql` — **Vitest:** 10 rows for demo-mal.

---

## Backend / data access (`lib/`, Route Handlers)

- [x] **`lib/db/pool.ts` + Drizzle klient** — `pg`-pool singleton; ingen migrasjon fra runtime.
- [x] **Typed DB layer** — `lib/db/schema.ts` matcher Flyway.
- [x] **Tenant resolution** — `readTenantBySlug` + **`GET /api/tenants/by-slug/[slug]`** (**Playwright:** `tests/e2e/tenantApi.spec.ts`).
- [x] **Admin API** — `BLEND_ADMIN_SECRET` (`Authorization: Bearer …`): `POST /api/admin/tenants/by-slug/[tenantSlug]/sessions`, `PATCH /api/admin/sessions/[publicId]`.
- [x] **Nyansatt API** — `GET` / `PATCH` / `POST` på **`/api/sessions/[publicId]/new-hire?nh=`** … (utkast → lås → `team_collecting`).
- [x] **Team API** — `GET` / `POST` **`/api/join/[plainToken]`** (`409` ved duplikat-innsending).
- [x] **Aggregation** — flertall, ties, persist `session_question_result`.
- [x] **Realtime / sync** — SSE for presenter + telefoner (`/api/sessions/[publicId]/live/stream`).

---

## Frontend

- [x] **Admin UI** — MVP: `/admin` (Bearer i nettleser), tenant-preview, opprett økt, lenker + QR, tekniske token. Mer: branding/quiz-CRUD, redigering i UI.
- [x] **New hire UI** — `/nyansatt/[publicId]?nh=` · alle MC + trygghet-bånd, auto-lagring (PATCH), låst oppsummering.
- [x] **Team UI** — `/lag/[token]` gjetteflyt + mobil-follower på samme URL (`SessionLiveClient`); admin QR på lag-URL.
- [x] **Presenter UI** — Full-screen reveal (kopp, facilitator-dokk, reveal-slide, harmoni, lyd-MVP). Mer polish underveis.
- [x] **Live snapshot (MVP)** — `/presenter/[publicId]` og `/mobil/[publicId]` med `GET /api/sessions/[publicId]/live` + SSE-stream.
- [x] **Cup illustration** — SVG-kopp med fyllnivå (MVP) · visuell polish.
- [x] **Audio** — Web Audio «pour»-klang med mute og motion-valg (MVP) · dedikert lydfil senere.
- [x] **End screen** — Harmoni-slutt basert på treffrate (MVP) · «Coffee Ground Prophecy»-copy senere.

---

## Auth & security

- [x] **Admin (MVP)** — `BLEND_ADMIN_SECRET` Bearer (ingen SSO ennå).
- [x] **Tokens** — `sha256`-hash av nh- og join-lenker; klartekst returneres ved opprettelse av økt fra admin.
- [ ] **RLS i Postgres** — valgfritt senere.

---

## Ops & quality

- [x] **Developer DB** — `docker-compose.yml` (Postgres 16 lokalt).
- [x] **Sliplane Web service** — Miljøvariabler dokumentert i `AGENTS.md` (Dockerfile / `/api/health`).
- [x] **Flyway i CI/deploy** — GitHub Actions `.github/workflows/ci.yml`: Flyway mot Postgres-service + Vitest med `DATABASE_URL`.
- [x] **Playwright ekspansjon** — `health.spec.ts`, `tenantApi.spec.ts`.
- [x] **Vitest økt-flyt** — `tests/database/sessionFlow.test.ts` (kjører når migrert DB + Flyway og `DATABASE_URL` er satt).
- [x] **`npm audit`** — Oppdatert `drizzle-orm`, dev transitive fixes, `overrides` for `postcss` — grønt audit.

---

## Post-MVP polish

- [ ] **Async vs Live** — Fasilitatorflyt Live Espresso.
- [ ] **Logo-upload** — Objektlager + URLs på tenant.
- [ ] **i18n readiness** — Nøkkelbaserte tekster.
- [ ] **Accessibility** — Etter MVP.

---

## Related docs

- Product/design principles: [`DESIGN.md`](DESIGN.md).
- Agent/dev workflow: [`AGENTS.md`](../AGENTS.md) (repo root).
