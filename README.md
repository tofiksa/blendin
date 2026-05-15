# Blend-In

Lun onboarding-quiz (App Router · Next.js · Tailwind · Biome · Playwright).

Prosjektmappa bruker **camelCase**: `blendIn` (ikke `blend-in`).

## Konvensjoner

- **TypeScript/React:** `camelCase` for variabler/funksjoner, `PascalCase` for komponenter.
- **Filer du legger til selv** (under `lib/`, hooks, utils): foretrekk **camelCase** filnavn, f.eks. `sessionStore.ts`. Next.js krever fortsatt fast navn på ruter (`page.tsx`, `layout.tsx`, `route.ts`).
- **SQL:** `snake_case` for tabeller og kolonner (Postgres-idiom).
- **npm-pakke-navn** i `package.json`: `blendIn` (camelCase).

## Lokalt

```bash
npm install
npm run dev
```

- Kodekvalitet: `npm run lint` / `npm run format`
- Integrasjonstester (PostgreSQL — **skipped** om `DATABASE_URL` mangler): `npm run test`
- E2E (starter dev-server automatisk): `npm run test:e2e`
- Første gang Playwright: `npm run setup:playwright`

Kopier `.env.example` til `.env` og sett `DATABASE_URL` når databasetilkobling er klar.

## HTTP API (MVP, JSON)

Felles: **admin** krever header `Authorization: Bearer <BLEND_ADMIN_SECRET>`. **Nyansatt** bruker `?nh=<token>` (returneres én gang ved `POST` admin opprett økt). **Team** bruker klartekst-token i path (`/api/join/...`), lagret som SHA-256 i databasen.

| Metode | Path | Formål |
|--------|------|--------|
| POST | `/api/admin/tenants/by-slug/demo/sessions` | Opprett økt (`mode`, valgfri `teamLinkCount`, `quizTemplateName`). Svar inneholder `urls` + klartekst-tokens. |
| PATCH | `/api/admin/sessions/:publicId` | Endre `state` (fasilitator). |
| GET/PATCH/POST | `/api/sessions/:publicId/new-hire?nh=…` | Les utkast/lagre/fullfør nyansatt (`answers` med `confidenceBand`). |
| GET/POST | `/api/join/:plainToken` | Hent quiz / lever gjetting (`guesses`, valgfri `displayName`). `409` hvis allerede sendt inn. |
| GET | `/api/tenants/by-slug/:slug` | Offentlig branding (krever migrert DB). |
| GET | `/api/health` | Liveness + databasefelt. |

## Database (Flyway)

Flyway-skript ligger i **`migrations/`** (f.eks. `V1__blend_in_initial.sql`). Kjør Flyway mot samme PostgreSQL som Sliplane bruker, med `locations` pekende på den mappa — eller kjør CLI fra prosjektroten:

### Lokal Postgres

```bash
docker compose up -d
export DATABASE_URL=postgresql://blend:blend@localhost:5432/blendin
```

Deretter kjør Flyway (eksempel):

```bash
flyway -locations=filesystem:migrations \
  -url=jdbc:postgresql://localhost:5432/blendin \
  -user=blend \
  -password=blend migrate
```

Og verifiser data med integrasjonstester:

```bash
npm test
```

### Produksjon / Sliplane

```bash
flyway -locations=filesystem:migrations -url="$JDBC_URL" -user="..." -password="..." migrate
```

## Docker (Sliplane)

Bygg og kjør containeren lokalt:

```bash
docker build -t blendIn .
docker run --rm -p 3000:3000 -e DATABASE_URL=... blendIn
```

Helsesjekk: `GET /api/health`.

## Git

Repoet er initialisert med `git init`. Opprett et tomt repo på GitHub/GitLab og:

```bash
git remote add origin <ssh-eller-https-url>
git add .
git commit -m "Initial commit"
git push -u origin main
```

(Committ kun når du er klar — ikke sjekk inn `.env`.)
