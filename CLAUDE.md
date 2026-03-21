# our-space — Claude Code Guide

AI-native PM tool for early-stage startups (5–50 people).

**Stack:** Rails 8 API + Next.js 15 (App Router) + PostgreSQL + pgvector on GCP.

---

## Repository Layout

```
our-space/
├── api/          # Rails 8 API-only backend
└── web/          # Next.js 15 App Router frontend
```

---

## Coding Standards (read these before touching any code)

### Backend (`api/`)
- **[api/CLAUDE.md](api/CLAUDE.md)** — master Rails guide; start here
- [api/docs/ARCHITECTURE.md](api/docs/ARCHITECTURE.md) — system design, layers, data flow
- [api/docs/CONTROLLERS.md](api/docs/CONTROLLERS.md) — thin controller pattern
- [api/docs/SERVICES.md](api/docs/SERVICES.md) — service object pattern + Result struct
- [api/docs/MODELS.md](api/docs/MODELS.md) — validations, scopes, callback rules
- [api/docs/TESTING.md](api/docs/TESTING.md) — RSpec fixtures-only, no let, no FactoryBot
- [api/docs/SERIALIZERS.md](api/docs/SERIALIZERS.md) — Blueprinter conventions
- [api/docs/ERROR_HANDLING.md](api/docs/ERROR_HANDLING.md) — rescue_from, error response format
- [api/docs/DEPLOYMENT.md](api/docs/DEPLOYMENT.md) — GCP Cloud Run + Cloud SQL

### Frontend (`web/`)
- **[web/CLAUDE.md](web/CLAUDE.md)** — Next.js/TypeScript rules; start here

---

## Non-Negotiable Rules (apply everywhere)

1. **Read the relevant guide before writing any code.** Every layer has explicit patterns.
2. **Zero business logic in controllers.** Controllers authenticate, authorize, call service, render.
3. **Services return `Result` structs.** Never raise from a service for expected failures.
4. **RSpec: fixtures only.** No FactoryBot, no `let`, no random data.
5. **`bundle exec rubocop` must pass clean.** CI fails on offenses.
6. **API responses are always `{ "data": {...} }` or `{ "error": {...} }`.** No exceptions.
7. **All secrets via Google Cloud Secret Manager in production.** No `.env` files committed.
8. **Auth is Clerk.** Never build password auth. All JWT verification via `clerk-sdk-ruby`.

---

## Build Order

See [PLAN.md](PLAN.md) for the full phased build plan with checkboxes.

Phase 0 (standards) must be complete before Phase 1 (scaffold).
Phase 2 (auth + DB) must be complete before Phase 3 (CRUD).

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth | Clerk | No password management; JWT verified by `clerk-sdk-ruby` |
| Serializers | Blueprinter | Used in deckbuilder-rag; consistent |
| Test data | Fixtures (YAML) | Deterministic; no FactoryBot magic |
| Embeddings | Voyage AI `voyage-3-lite` (1024 dims) | Best for technical text |
| AI model | `claude-sonnet-4-6` streaming | Latest, best quality |
| Job queue | Solid Queue (Rails 8 default) | No Redis |
| Deployment | GCP Cloud Run | Serverless, scales to zero |
