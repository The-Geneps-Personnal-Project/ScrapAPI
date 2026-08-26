# ScrapAPI

REST API backing [ScrapBot](https://github.com/The-Geneps-Personnal-Project/ScrapTS):
stores the tracked mangas, the reader sites, and the links between them in SQLite.

Requires **Node 20+**.

## Usage

```bash
npm install
npm run dev     # ts-node-dev, reloads on change
npm run start   # build + run
npm test        # integration tests against an in-memory database
npm run lint
```

Copy `.env.example` to `.env` first. Schema migrations run automatically at startup.

## Conventions

- Request bodies and query strings are validated with [zod](https://zod.dev). An invalid
  payload gets **400** with the offending field paths.
- Errors are JSON: `{ "error": { "code", "message" } }`. Internal details are logged
  server-side ([pino](https://getpino.io)) and never sent to the client.
- Multi-statement writes run in transactions, so a partial failure rolls back.

## Endpoints

### `/mangas`

| Method | Path | Body / Query | Success | Errors |
| --- | --- | --- | --- | --- |
| GET | `/mangas` | — | 200 — all mangas with sites and tags | |
| GET | `/mangas/:name` | — | 200 | 404 |
| GET | `/mangas/site/:name` | — | 200 — every manga on that site | |
| POST | `/mangas` | `{ anilist_id, name, chapter, alert?, sites[], infos? }` | 201 | 400, 409 |
| POST | `/mangas/site` | `{ manga, site }` | 201 | 400, 404 |
| PUT | `/mangas` | full manga **including `id`** | 200 | 400, 404 |
| PUT | `/mangas/chapter` | `{ name, chapter, last_updated? }` | 200 | 400, 404 |
| DELETE | `/mangas` | `?name=` | 200 | 400, 404 |
| DELETE | `/mangas/site` | `?manga=&site=` | 200 | 400, 404 |

`alert` defaults to `1` when omitted, and `0` is preserved. `infos.coverImage` accepts
either a URL string or AniList's `{ medium }` shape and is stored as a string.

Site URLs come back with the manga's slug already appended, ready to fetch.

### `/sites`

| Method | Path | Body / Query | Success | Errors |
| --- | --- | --- | --- | --- |
| GET | `/sites` | — | 200 | |
| GET | `/sites/:name` | — | 200 | 404 |
| POST | `/sites` | `{ site, url, chapter_url, chapter_limiter }` | 201 | 400, 409 |
| PUT | `/sites` | same | 200 | 400, 404 |
| DELETE | `/sites` | `?name=` | 200 | 400, 404 |

Site names are unique — every lookup is keyed on them.

### `/health`

`200 { "status": "ok" }`. Excluded from request logging.

## Database

SQLite, driven by raw parameterised SQL (no ORM). The file is resolved relative to the
project root, not the working directory.

Migrations live in `src/db/migrations.ts` and run at startup. To change the schema, add
a new numbered migration — never edit an applied one. Foreign keys are enforced
(`PRAGMA foreign_keys = ON`).
