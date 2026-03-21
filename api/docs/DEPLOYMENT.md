# Deployment (GCP)

Production stack: Cloud Run (Rails API) + Cloud SQL (PostgreSQL 16 + pgvector) + Secret Manager.

---

## Architecture

```
Internet → Cloud Load Balancer → Cloud Run (Rails API)
                                       │ private VPC connector
                                       ▼
                               Cloud SQL (PostgreSQL 16)
                               pgvector extension enabled

Cloud Build → Artifact Registry → Cloud Run deployments
Secret Manager ← all env secrets (no .env in production)
```

---

## Dockerfile

Multi-stage build: builder installs gems + assets, final image is minimal.

```dockerfile
# syntax=docker/dockerfile:1
ARG RUBY_VERSION=3.3
FROM ruby:${RUBY_VERSION}-slim AS base

WORKDIR /rails

# Install system dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
      build-essential \
      curl \
      libpq-dev \
      pkg-config && \
    rm -rf /var/lib/apt/lists/*

# ------- Builder stage -------
FROM base AS builder

# Install gems
COPY Gemfile Gemfile.lock ./
RUN bundle config set --local deployment true && \
    bundle config set --local without "development test" && \
    bundle install --jobs=4 --retry=3

# Copy application code
COPY . .

# Precompile bootsnap
RUN bundle exec bootsnap precompile app/ lib/

# ------- Final stage -------
FROM base AS final

# Non-root user
RUN useradd --create-home --shell /bin/bash rails
USER rails

WORKDIR /rails

# Copy built artifacts from builder
COPY --from=builder --chown=rails:rails /usr/local/bundle /usr/local/bundle
COPY --from=builder --chown=rails:rails /rails /rails

# Cloud Run listens on PORT (default 8080)
ENV RAILS_ENV=production
ENV PORT=8080

EXPOSE 8080

# Entrypoint: run migrations, then start puma
ENTRYPOINT ["bash", "-c"]
CMD ["bundle exec rails server -b 0.0.0.0 -p $PORT"]
```

---

## cloudbuild.yaml

```yaml
# cloudbuild.yaml
steps:
  # 1. Build Docker image
  - name: "gcr.io/cloud-builders/docker"
    args:
      - build
      - --tag
      - "${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_ARTIFACT_REPO}/api:${SHORT_SHA}"
      - --tag
      - "${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_ARTIFACT_REPO}/api:latest"
      - --file
      - api/Dockerfile
      - api/

  # 2. Push to Artifact Registry
  - name: "gcr.io/cloud-builders/docker"
    args:
      - push
      - "--all-tags"
      - "${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_ARTIFACT_REPO}/api"

  # 3. Run migrations as a Cloud Run Job
  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: gcloud
    args:
      - run
      - jobs
      - execute
      - api-migrate
      - --region=${_REGION}
      - --wait
      - --image=${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_ARTIFACT_REPO}/api:${SHORT_SHA}
      - --set-secrets=DATABASE_URL=DATABASE_URL:latest,CLERK_SECRET_KEY=CLERK_SECRET_KEY:latest

  # 4. Deploy to Cloud Run
  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: gcloud
    args:
      - run
      - deploy
      - api
      - --region=${_REGION}
      - --image=${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_ARTIFACT_REPO}/api:${SHORT_SHA}
      - --platform=managed
      - --allow-unauthenticated
      - --port=8080
      - --min-instances=1
      - --max-instances=10
      - --memory=512Mi
      - --cpu=1
      - --timeout=300
      - --set-secrets=DATABASE_URL=DATABASE_URL:latest,CLERK_SECRET_KEY=CLERK_SECRET_KEY:latest,CLERK_PUBLISHABLE_KEY=CLERK_PUBLISHABLE_KEY:latest,ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,VOYAGE_API_KEY=VOYAGE_API_KEY:latest,CLERK_WEBHOOK_SECRET=CLERK_WEBHOOK_SECRET:latest,SECRET_KEY_BASE=SECRET_KEY_BASE:latest
      - --vpc-connector=${_VPC_CONNECTOR}
      - --vpc-egress=private-ranges-only

substitutions:
  _REGION: us-central1
  _ARTIFACT_REPO: our-space
  _VPC_CONNECTOR: projects/${PROJECT_ID}/locations/${_REGION}/connectors/our-space-connector

images:
  - "${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_ARTIFACT_REPO}/api:${SHORT_SHA}"
  - "${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_ARTIFACT_REPO}/api:latest"
```

---

## Cloud SQL Setup

```bash
# Create PostgreSQL 16 instance
gcloud sql instances create our-space-db \
  --database-version=POSTGRES_16 \
  --tier=db-g1-small \
  --region=us-central1 \
  --network=our-space-vpc \
  --no-assign-ip

# Create database
gcloud sql databases create our_space_production \
  --instance=our-space-db

# Create user
gcloud sql users create our_space_app \
  --instance=our-space-db \
  --password=$(openssl rand -base64 32)

# Enable pgvector extension (run after first migration)
# This is handled by migration 001:
# execute "CREATE EXTENSION IF NOT EXISTS vector"
```

**DATABASE_URL format for Cloud SQL (private IP):**
```
postgresql://our_space_app:PASSWORD@PRIVATE_IP/our_space_production
```

Store this in Secret Manager as `DATABASE_URL`.

---

## Secret Manager

All production secrets are stored in Google Cloud Secret Manager. Never commit `.env` files or hardcode secrets.

```bash
# Store secrets
echo -n "sk_live_..." | gcloud secrets create CLERK_SECRET_KEY --data-file=-
echo -n "pk_live_..." | gcloud secrets create CLERK_PUBLISHABLE_KEY --data-file=-
echo -n "sk-ant-..." | gcloud secrets create ANTHROPIC_API_KEY --data-file=-
echo -n "pa-..." | gcloud secrets create VOYAGE_API_KEY --data-file=-
echo -n "whsec_..." | gcloud secrets create CLERK_WEBHOOK_SECRET --data-file=-
echo -n "$(openssl rand -hex 64)" | gcloud secrets create SECRET_KEY_BASE --data-file=-
echo -n "postgresql://..." | gcloud secrets create DATABASE_URL --data-file=-

# Grant Cloud Run service account access
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Environment Variables

| Variable | Source in Production | Used For |
|----------|---------------------|----------|
| `DATABASE_URL` | Secret Manager | PostgreSQL connection |
| `CLERK_SECRET_KEY` | Secret Manager | Clerk JWT verification |
| `CLERK_PUBLISHABLE_KEY` | Secret Manager | Clerk frontend init |
| `CLERK_WEBHOOK_SECRET` | Secret Manager | Svix webhook signature verification |
| `ANTHROPIC_API_KEY` | Secret Manager | Claude API |
| `VOYAGE_API_KEY` | Secret Manager | Voyage AI embeddings |
| `SECRET_KEY_BASE` | Secret Manager | Rails session encryption |
| `RAILS_ENV` | Set in Dockerfile | `production` |
| `PORT` | Set by Cloud Run | `8080` |

Local development: `.env` file (not committed). Use `dotenv-rails` gem in dev/test only.

---

## Health Check

Cloud Run requires a health check endpoint. Rails 8 includes one by default:

```ruby
# config/routes.rb
get "/up", to: "rails/health#show"
```

Configure Cloud Run to check `GET /up` — expects 200. This endpoint is always accessible without auth.

Cloud Run startup probe configuration:
```yaml
# In Cloud Run service config (via gcloud or Console)
startupProbe:
  httpGet:
    path: /up
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 6
livenessProbe:
  httpGet:
    path: /up
    port: 8080
  periodSeconds: 30
```

---

## Database Migrations in Production

Migrations run as a **Cloud Run Job** before the new revision receives traffic. This is step 3 in `cloudbuild.yaml`.

The migration job uses the same Docker image as the API but runs:
```bash
bundle exec rails db:migrate
```

Create the Cloud Run Job once:
```bash
gcloud run jobs create api-migrate \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/our-space/api:latest \
  --region=us-central1 \
  --command="bundle" \
  --args="exec,rails,db:migrate" \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest \
  --vpc-connector=our-space-connector \
  --vpc-egress=private-ranges-only \
  --max-retries=1
```

The `cloudbuild.yaml` updates the image and re-executes this job on each deploy.

---

## Local Development

```bash
# .env (not committed)
DATABASE_URL=postgresql://localhost/our_space_development
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
ANTHROPIC_API_KEY=sk-ant-...
VOYAGE_API_KEY=pa-...
SECRET_KEY_BASE=dev_secret_key_base_change_in_production

# Start dev server
bundle exec rails server

# Run tests
bundle exec rspec

# Lint
bundle exec rubocop
```

---

## Solid Queue (no Redis)

Background jobs use Solid Queue (Rails 8 default). Job data is stored in the PostgreSQL database — no Redis or separate job server needed.

```ruby
# config/queue.yml
default: &default
  dispatchers:
    - polling_interval: 1
      batch_size: 500
  workers:
    - queues: "*"
      threads: 3
      processes: 1
      polling_interval: 0.1

production:
  <<: *default
  workers:
    - queues: "default,embeddings"
      threads: 5
      processes: 1
      polling_interval: 0.1
```

In Cloud Run, run Solid Queue in the same container as the API (for small scale) or as a separate Cloud Run service.
