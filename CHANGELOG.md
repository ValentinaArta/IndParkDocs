# Changelog

## [Unreleased] — 2026-02-27

### Added
- **Structured logging** — `pino` logger replaces all `console.log`/`console.error` in server code (#14)
- **XSS middleware** — centralized `xssClean` middleware sanitizes `req.body` recursively; removed manual `xss()` calls from routes (#16)

- **Pagination** — `limit`/`offset` support for `/api/reports/rent-analysis` and `/api/reports/aggregate`
- **Contract navigation** — accordion in sidebar with sub-items by contract type (Аренды, Субаренды, Подряда, etc.)
- **Tests** — Jest + Supertest: 29 tests covering auth endpoints (login, refresh, logout, register, change-password, /me) and entities CRUD (list, get, create, update, delete with role checks)
- **API.md** — full API documentation for all endpoints
- **Frontend TOC** — table of contents at the top of inline frontend.js (~7k lines) for maintainability

### Security
- **JWT_SECRET** — throws error at startup if not set in production (#4)
- **JWT_REFRESH_SECRET** — separate secret for refresh tokens (#5)
- **SSL** — `rejectUnauthorized` defaults to `true` in production, configurable via `DB_SSL_REJECT_UNAUTHORIZED` (#2)
- **CSP** — Content Security Policy enabled with `unsafe-inline` for inline frontend (#3)

### Fixed
- **PATCH endpoint** — now calls `logAction` and `autoLinkEntities` like PUT (#8)
- **Migrations** — idempotent via `_migrations` table, each runs only once (#1)

### Changed
- `.env.example` updated with new variables (`JWT_REFRESH_SECRET`, `DB_SSL_REJECT_UNAUTHORIZED`)
