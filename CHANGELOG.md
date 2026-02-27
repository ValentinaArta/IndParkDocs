# Changelog

## [Unreleased] — 2026-02-27

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
