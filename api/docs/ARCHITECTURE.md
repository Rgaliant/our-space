# Architecture

## System Overview

```
Internet
    │
    ▼
Cloud Load Balancer
    │
    ▼
Cloud Run (Rails 8 API)  ─── private VPC ──▶  Cloud SQL (PostgreSQL 16 + pgvector)
    │
    ├──▶ Clerk JWKS (JWT verification)
    ├──▶ Anthropic API (claude-sonnet-4-6, streaming)
    ├──▶ Voyage AI API (voyage-3-lite embeddings, 1024 dims)
    └──▶ Google Cloud Secret Manager (all secrets)

Cloud Build  ──▶  Artifact Registry  ──▶  Cloud Run deployments
```

---

## Application Layers

```
Request
  │
  ▼
┌─────────────────────────────────────────────┐
│  Middleware (Rack)                           │
│  • Rack::Attack — rate limiting              │
│  • CORS — allow Next.js origin               │
│  • Clerk JWT verification                    │
└─────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────┐
│  Controllers (app/controllers/)              │
│  • Authenticate (Clerk)                      │
│  • Authorize (workspace membership)          │
│  • Call service                              │
│  • Render JSON (Blueprinter)                 │
│  ZERO business logic here                    │
└─────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────┐
│  Services (app/services/)                    │
│  • All business logic lives here             │
│  • Plain Ruby objects, no Rails inheritance  │
│  • Single public method: call                │
│  • Returns Result struct                     │
└─────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────┐
│  Models (app/models/)                        │
│  • Validations                               │
│  • Named scopes                              │
│  • Associations                              │
│  • No callbacks touching other models        │
└─────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────┐
│  Database (PostgreSQL + pgvector)            │
│  • Cloud SQL on GCP                          │
│  • pgvector extension for embeddings         │
│  • Solid Queue tables for background jobs    │
└─────────────────────────────────────────────┘
```

---

## Domain Model

```
User (Clerk ID as PK)
  │
  └── WorkspaceMember ──▶ Workspace
                              │
                              ├── Project
                              │     │
                              │     ├── Spec ──▶ Ticket (many)
                              │     │
                              │     └── Feedback
                              │
                              ├── Conversation
                              │     └── ConversationMessage
                              │
                              └── Embedding (polymorphic source)
```

**Key relationships:**
- A `User` belongs to many `Workspaces` through `WorkspaceMember` (roles: owner, admin, stakeholder, engineer)
- A `Workspace` has many `Projects`
- A `Project` has many `Specs` (AI-generated or manual)
- A `Spec` has many `Tickets` (auto-generated from spec content)
- `Embedding` is polymorphic — indexes specs, tickets, and feedback for RAG search
- `Conversation` tracks Planning Mode chat history; generates `Spec` + `Tickets` on completion

---

## Data Flow: Planning Mode (Core Feature)

```
Next.js Client
  │
  │  POST /api/v1/workspaces/:slug/ai/plan
  │  { message: "I want to build a notification system" }
  │
  ▼
Api::V1::Ai::PlanController
  │
  ▼
Ai::PlanningModeService
  ├── Load workspace context (workspace.context jsonb)
  ├── Load conversation history
  ├── Rag::SearchService → find related specs/tickets/feedback
  ├── Build system prompt (forces clarifying questions, injects context)
  ├── Stream claude-sonnet-4-6 via Anthropic SDK (SSE)
  └── On <generate_spec> XML tag:
        └── Ai::SpecGeneratorService
              ├── Parse Claude output
              ├── Create Spec record
              ├── Create Ticket records (with priority_score, story_points)
              └── Queue Rag::EmbeddingService jobs (Solid Queue)

SSE stream → Next.js planning-chat.tsx component
```

---

## Data Flow: RAG Embeddings

```
Spec/Ticket saved
  │
  ▼
Solid Queue Job (async)
  │
  ▼
Rag::EmbeddingService
  ├── Chunk content (≤512 tokens per chunk)
  ├── POST https://api.voyageai.com/v1/embeddings
  │   model: voyage-3-lite, input_type: document
  └── Store Embedding records (vector(1024), HNSW index)

Search:
  Rag::SearchService
    ├── Embed query via Voyage AI (input_type: query)
    └── SELECT * FROM embeddings
        WHERE workspace_id = $1 AND source_type = $2
        ORDER BY embedding <=> $3::vector
        LIMIT $4
```

---

## Auth Flow (Clerk)

```
Next.js (Clerk SDK)
  │  signs in user
  │  issues JWT
  │
  ▼
Every API request:
  Authorization: Bearer <clerk-jwt>
  │
  ▼
Clerk::Authenticatable (middleware)
  │  verifies JWT against Clerk JWKS endpoint
  │  sets clerk_session.user_id
  │
  ▼
ApplicationController#current_user
  │  User.find(clerk_session.user_id)
  │  user record synced from Clerk webhook
  ▼
Controller action proceeds

Webhooks (POST /webhooks/clerk):
  Clerk → (svix signature) → WebhooksController
    user.created / user.updated → User.upsert
```

---

## Background Jobs (Solid Queue)

All async work uses Solid Queue (Rails 8 default — no Redis needed).

Jobs live in `app/jobs/`. Current jobs:
- `EmbedDocumentJob` — embeds specs/tickets/feedback after save
- `PrioritizeBacklogJob` — batch-scores tickets via Claude (nightly or on-demand)

---

## Streaming (SSE)

AI endpoints use `ActionController::Live` for Server-Sent Events:

```ruby
include ActionController::Live

def plan
  response.headers["Content-Type"] = "text/event-stream"
  response.headers["Cache-Control"] = "no-cache"
  sse = SSE.new(response.stream, event: "message")

  Ai::PlanningModeService.new(...).call do |chunk|
    sse.write({ content: chunk })
  end
ensure
  sse.close
end
```

---

## Configuration

| Config | Location |
|--------|----------|
| Clerk | `config/initializers/clerk.rb` |
| CORS | `config/initializers/cors.rb` |
| Rate limiting | `config/initializers/rack_attack.rb` |
| Solid Queue | `config/queue.yml` |
| Secrets (dev) | `.env` (not committed) |
| Secrets (prod) | Google Cloud Secret Manager |
