# our-space — Project Tracking

AI-native PM tool for early-stage startups (5–50 people).
Rails 8 API + Next.js 15 frontend, deployed to GCP (Cloud Run + Cloud SQL).

---

## Phase 0 — Coding Standards Files

- [x] `PLAN.md` — project tracking file
- [x] `CLAUDE.md` — root index + high-level rules
- [x] `api/CLAUDE.md` — comprehensive Rails rules
- [x] `api/docs/ARCHITECTURE.md` — system design, layers, data flow
- [x] `api/docs/CONTROLLERS.md` — thin controller pattern
- [x] `api/docs/SERVICES.md` — Result struct, service naming, DI
- [x] `api/docs/MODELS.md` — validations, scopes, callbacks rules
- [x] `api/docs/TESTING.md` — fixtures-only, no let, no FactoryBot
- [x] `api/docs/SERIALIZERS.md` — Blueprinter conventions
- [x] `api/docs/ERROR_HANDLING.md` — rescue_from, error format
- [x] `api/docs/DEPLOYMENT.md` — GCP Cloud Run + Cloud SQL + Secret Manager
- [x] `web/CLAUDE.md` — Next.js/TypeScript frontend rules

---

## Phase 1 — Rails Scaffold

- [ ] `rails new api --api --database=postgresql --skip-action-mailer --skip-action-mailbox`
- [ ] Add all gems to `Gemfile`, `bundle install`
- [ ] Configure RuboCop Omakase (`.rubocop.yml`)
- [ ] Configure Clerk initializer (`config/initializers/clerk.rb`)
- [ ] Configure CORS: allow Next.js origin (`config/initializers/cors.rb`)
- [ ] Configure Rack::Attack (`config/initializers/rack_attack.rb`)
- [ ] `GET /up` health check route

---

## Phase 2 — Auth + Database

- [ ] Migration 001 — enable pgvector extension
- [ ] Migration 002 — users (Clerk ID as string PK, no passwords)
- [ ] Migration 003 — workspaces
- [ ] Migration 004 — workspace_members
- [ ] Migration 005 — projects
- [ ] Migration 006 — conversations + conversation_messages
- [ ] Migration 007 — specs
- [ ] Migration 008 — tickets
- [ ] Migration 009 — feedback
- [ ] Migration 010 — embeddings (pgvector, HNSW index)
- [ ] `rails db:migrate`
- [ ] `ApplicationController` with `Clerk::Authenticatable` + `require_clerk_session!`
- [ ] `WebhooksController` — Clerk user sync (skip auth, verify Svix signature)
- [ ] RSpec setup: `rails_helper.rb` with `fixtures :all`, `ClerkHelpers` module
- [ ] Fixture files: `users.yml`, `workspaces.yml`, `workspace_members.yml`, `projects.yml`, `specs.yml`, `tickets.yml`

---

## Phase 3 — Workspace + Project CRUD

- [ ] `WorkspacesController` — full CRUD via service objects
- [ ] `ProjectsController` — full CRUD via service objects
- [ ] `WorkspaceMember` authorization (users only access workspaces they belong to)
- [ ] Blueprinter serializers: `WorkspaceSerializer`, `ProjectSerializer`
- [ ] Request specs: workspaces, projects

---

## Phase 4 — Specs + Tickets

- [ ] `SpecsController` — full CRUD
- [ ] `TicketsController` — full CRUD (with priority_score, position)
- [ ] Blueprinter serializers: `SpecSerializer`, `TicketSerializer`
- [ ] Request specs: specs, tickets

---

## Phase 5 — RAG Foundation

- [ ] `Rag::EmbeddingService` — Voyage AI via Faraday (1024 dims, voyage-3-lite)
- [ ] `Rag::SearchService` — cosine similarity search via pgvector
- [ ] Solid Queue job: embed specs/tickets after save (async)
- [ ] WebMock stubs for Voyage AI in tests
- [ ] Service specs: embedding, search

---

## Phase 6 — Planning Mode AI (Core Feature)

- [ ] `Ai::PlanningModeService` — system prompt, RAG injection, `<generate_spec>` XML tag
- [ ] `Ai::SpecGeneratorService` — parse Claude output → create Spec + Tickets
- [ ] `Api::V1::Ai::PlanController` — SSE streaming via `ActionController::Live`
- [ ] `ConversationsController` — CRUD + message history
- [ ] Next.js: `planning-chat.tsx` streaming UI component
- [ ] Next.js: `/workspace/[slug]/plan` page
- [ ] Service specs + request specs

---

## Phase 7 — Engineer Focus Mode

- [ ] `Ai::PrioritizationService` — batch scores backlog via Claude
- [ ] `Ai::TicketAssistantService` — streaming, injects ticket + spec + RAG context
- [ ] `Api::V1::Ai::TicketController` — SSE streaming
- [ ] Next.js: engineer daily brief page (`/workspace/[slug]/engineer`)
- [ ] Next.js: ticket detail page with AI assistant (`/workspace/[slug]/tickets/[ticketId]`)

---

## Phase 8 — Feedback + Onboarding

- [ ] `FeedbackController` — CRUD
- [ ] Workspace onboarding flow: captures business context → `workspace.context` jsonb
- [ ] `Rack::Attack` rate limiting on `/api/v1/ai/*` (10 req/min per user)
- [ ] Request specs: feedback

---

## Phase 9 — GCP Deployment

- [ ] Multi-stage `Dockerfile` (Ruby 3.3+, production-optimized)
- [ ] `cloudbuild.yaml` — build → push to Artifact Registry → deploy to Cloud Run
- [ ] Cloud SQL (PostgreSQL 16) — private IP, Cloud SQL Auth Proxy sidecar in Cloud Run
- [ ] All secrets in Google Cloud Secret Manager (no `.env` in production)
- [ ] `rails db:migrate` as Cloud Run Job before traffic switch
- [ ] `GET /up` health check verified in Cloud Run
- [ ] `min-instances: 1` to eliminate cold starts

---

## Verification Checklist

- [ ] `bundle exec rubocop` passes clean from first commit
- [ ] `bundle exec rspec` passes with 0 failures, 0 pending
- [ ] `GET /up` returns 200 in all environments
- [ ] Founder flow: sign up → create workspace → Planning Mode chat → spec + tickets in < 3 min
- [ ] Engineer flow: log in → daily brief → open ticket → AI assistant answers with spec reference
- [ ] Deployed to Cloud Run with Cloud SQL + Secret Manager in production
