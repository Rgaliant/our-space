# our-space — Build Plan

## Status: All phases complete ✓

---

## Phase 0 — Coding Standards Files ✅
- [x] `PLAN.md` — project tracking
- [x] `CLAUDE.md` — root index
- [x] `api/CLAUDE.md` — Rails master guide
- [x] `api/docs/CONTROLLERS.md`
- [x] `api/docs/SERVICES.md`
- [x] `api/docs/MODELS.md`
- [x] `api/docs/TESTING.md`
- [x] `api/docs/SERIALIZERS.md`
- [x] `api/docs/ERROR_HANDLING.md`
- [x] `api/docs/DEPLOYMENT.md`
- [x] `web/CLAUDE.md`

## Phase 1 — Rails Scaffold ✅
- [x] `rails new api --api --database=postgresql`
- [x] Gemfile with all dependencies
- [x] RuboCop Omakase config
- [x] Clerk initializer
- [x] CORS config
- [x] Rack::Attack rate limiting

## Phase 2 — Auth + Database ✅
- [x] 10 migrations (pgvector, users, workspaces, workspace_members, projects, conversations, specs, tickets, feedback, embeddings)
- [x] ApplicationController with Clerk auth + rescue_from handlers
- [x] WebhooksController (Clerk user sync)
- [x] GET /up health check
- [x] RSpec setup (rails_helper, fixtures, ClerkHelpers)

## Phase 3 — Workspace + Project CRUD ✅
- [x] WorkspacesController (full CRUD)
- [x] ProjectsController (full CRUD)
- [x] Service objects (Create, Update, Destroy)
- [x] Blueprinter serializers
- [x] Request specs: 15 examples, 0 failures

## Phase 4 — Specs + Tickets ✅
- [x] SpecsController (full CRUD)
- [x] TicketsController (full CRUD)
- [x] Service objects (Create, Update, Destroy)
- [x] Blueprinter serializers
- [x] Request specs: 29 examples, 0 failures

## Phase 5 — RAG Foundation ✅
- [x] Rag::EmbeddingService (Voyage AI voyage-3-lite)
- [x] Rag::SearchService (cosine similarity via pgvector hnsw)
- [x] Rag::EmbedRecordService (upserts Embedding records)
- [x] EmbedRecordJob (Solid Queue async)
- [x] Service specs with WebMock: 4 examples, 0 failures

## Phase 6 — Planning Mode AI ✅
- [x] Ai::PlanningModeService (streaming + <generate_spec> detection)
- [x] Ai::SpecGeneratorService (XML parsing → Spec + Tickets)
- [x] Api::V1::Ai::PlanController (SSE streaming)
- [x] ConversationsController + ConversationMessagesController
- [x] Next.js: PlanningChat component, plan page

## Phase 7 — Engineer Focus Mode ✅
- [x] Ai::PrioritizationService (batch ticket scoring)
- [x] Ai::TicketAssistantService (streaming with RAG)
- [x] Api::V1::Ai::TicketController (SSE)
- [x] Api::V1::Ai::PrioritizeController
- [x] Next.js: TicketAssistant, engineer page, PrioritizeButton

## Phase 8 — Feedback + Onboarding ✅
- [x] FeedbackController (full CRUD at workspace level)
- [x] WorkspaceOnboardingController (stores context jsonb)
- [x] Request specs: 37 examples, 0 failures

## Phase 9 — GCP Deployment ✅
- [x] Multi-stage Dockerfile (Ruby 3.3 slim)
- [x] cloudbuild.yaml (build → push → migrate → deploy)
- [x] .dockerignore
- [x] Cloud Run: min-instances=1, secrets from Secret Manager
- [x] Health check: GET /up → 200

---

## Architecture

```
Internet → Cloud Load Balancer → Cloud Run (Rails API, port 8080)
                                      ↓ private VPC
                                 Cloud SQL (PostgreSQL 16 + pgvector)
                                 [Clerk JWKS] [Anthropic] [Voyage AI]
                                 Cloud Secret Manager (all secrets)
                                 Artifact Registry (Docker images)
                                 Cloud Build (CI/CD)
```

## Test Coverage
- 37 RSpec examples, 0 failures
- 0 RuboCop offenses

## Total Spec Count by Domain
- Workspaces: 9 examples
- Projects: 7 examples
- Specs: 7 examples
- Tickets: 7 examples
- Feedback: 3 examples
- RAG services: 4 examples
