# api/ — Rails 8 API Standards

This is the authoritative guide for all Rails code in `api/`. Read this before writing any backend code. For deeper coverage of each topic, see the linked docs.

---

## Quick Reference

| Topic | Guide |
|-------|-------|
| Architecture & layers | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Controllers | [docs/CONTROLLERS.md](docs/CONTROLLERS.md) |
| Service objects | [docs/SERVICES.md](docs/SERVICES.md) |
| Models | [docs/MODELS.md](docs/MODELS.md) |
| Testing (RSpec) | [docs/TESTING.md](docs/TESTING.md) |
| Serializers | [docs/SERIALIZERS.md](docs/SERIALIZERS.md) |
| Error handling | [docs/ERROR_HANDLING.md](docs/ERROR_HANDLING.md) |
| Deployment (GCP) | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |

---

## The Law (non-negotiable)

### Controllers

- Inherit from `ApplicationController < ActionController::API`
- Max 5 public actions: `index`, `show`, `create`, `update`, `destroy`
- **Zero business logic** — only: authenticate → authorize → call service → render
- Use `params.expect()` (Rails 8 syntax) — **never** `params.require().permit()`
- `before_action` only for: `require_clerk_session!`, loading records by ID
- **Never** call ActiveRecord queries directly in a controller action

```ruby
class Api::V1::SpecsController < ApplicationController
  before_action :set_workspace
  before_action :set_spec, only: [:show, :update, :destroy]

  def create
    result = Specs::CreateService.new(spec_params, workspace: @workspace, user: current_user).call
    if result.success?
      render json: SpecSerializer.render(result.payload), status: :created
    else
      render json: { error: { message: result.error, code: "SPEC_CREATION_FAILED" } },
             status: :unprocessable_entity
    end
  end

  private

  def spec_params
    params.expect(spec: [:title, :content])
  end

  def set_workspace
    @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
  end

  def set_spec
    @spec = @workspace.specs.find(params[:id])
  end
end
```

### Services

- Plain Old Ruby Objects — no Rails inheritance
- Single public method: `call` — returns a `Result` struct
- Named by domain + role + `Service` suffix: `Specs::CreateService`, `Rag::SearchService`
- Dependency injection via constructor (never reach for globals)
- Stateless — do not hold mutable state between calls

```ruby
# app/services/result.rb — shared across all services
Result = Struct.new(:success, :payload, :error, keyword_init: true) do
  def success? = success
  def failure? = !success
end
```

```ruby
# app/services/specs/create_service.rb
module Specs
  class CreateService
    def initialize(params, workspace:, user:)
      @params = params
      @workspace = workspace
      @user = user
    end

    def call
      spec = @workspace.specs.build(@params.merge(created_by: @user))
      if spec.save
        Result.new(success: true, payload: spec)
      else
        Result.new(success: false, error: spec.errors.full_messages.to_sentence)
      end
    end
  end
end
```

### Models

- All validations in the model, never in controllers or services
- Use named scopes for common queries
- Callbacks only for: timestamps, slug generation — **never** callbacks that touch other models
- No raw SQL — use scopes, Arel, or `app/queries/` objects

### Auth (Clerk)

- `ApplicationController` includes `Clerk::Authenticatable`
- All controllers inherit `before_action :require_clerk_session!`
- `current_user` lazy-loads the `User` record by Clerk user ID
- Webhooks controller skips auth; verifies Svix signature instead

```ruby
class ApplicationController < ActionController::API
  include Clerk::Authenticatable
  before_action :require_clerk_session!

  rescue_from StandardError,                  with: :handle_server_error
  rescue_from ActiveRecord::RecordNotFound,   with: :handle_not_found
  rescue_from ActiveRecord::RecordInvalid,    with: :handle_unprocessable

  private

  def current_user
    @current_user ||= User.find(clerk_session.user_id)
  end
end
```

### Testing (RSpec)

- **Request specs only** (no controller specs)
- **Fixtures only** — no FactoryBot, no `let`, no random data
- `before(:each)` with instance variables — never `let`/`let!`
- See [docs/TESTING.md](docs/TESTING.md) for full rules and patterns

### API Response Format

Every response must conform to one of these shapes:

```json
{ "data": { "id": "...", "type": "spec", "attributes": { ... } } }
```

```json
{ "error": { "message": "Human-readable message", "code": "SNAKE_CASE_CODE", "details": {} } }
```

HTTP status codes in use: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `422`, `500`.

---

## Code Style

- **RuboCop Rails Omakase** — `.rubocop.yml` at repo root
- 2-space indent, double quotes, 120-char line limit
- `bundle exec rubocop` must pass before every commit
- CI fails on any offense
- Run: `bundle exec rubocop -A` to auto-fix before committing

---

## File Structure

```
api/app/
├── controllers/
│   ├── application_controller.rb
│   ├── webhooks_controller.rb
│   ├── concerns/
│   └── api/v1/
│       ├── auth/me_controller.rb
│       ├── workspaces_controller.rb
│       ├── projects_controller.rb
│       ├── specs_controller.rb
│       ├── tickets_controller.rb
│       ├── conversations_controller.rb
│       ├── feedback_controller.rb
│       └── ai/
│           ├── plan_controller.rb      # SSE — Planning Mode
│           └── ticket_controller.rb    # SSE — ticket assistant
├── models/
│   ├── concerns/
│   ├── user.rb
│   ├── workspace.rb
│   ├── workspace_member.rb
│   ├── project.rb
│   ├── spec.rb
│   ├── ticket.rb
│   ├── conversation.rb
│   ├── conversation_message.rb
│   ├── feedback.rb
│   └── embedding.rb
├── serializers/                        # Blueprinter
├── services/
│   ├── result.rb                       # Shared Result struct
│   ├── ai/
│   │   ├── planning_mode_service.rb
│   │   ├── spec_generator_service.rb
│   │   ├── ticket_assistant_service.rb
│   │   └── prioritization_service.rb
│   └── rag/
│       ├── embedding_service.rb
│       └── search_service.rb
└── queries/                            # Complex AR queries go here
```

---

## Gems (key dependencies)

```ruby
gem "clerk-sdk-ruby", require: "clerk"   # Auth
gem "blueprinter"                         # Serializers
gem "rack-cors"                           # CORS
gem "rack-attack"                         # Rate limiting
gem "anthropic"                           # Anthropic SDK
gem "pgvector"                            # pgvector AR adapter
gem "neighbor"                            # Nearest-neighbor helpers
gem "faraday", "~> 2.9"                  # HTTP client (Voyage AI)
gem "faraday-retry", "~> 2.2"

group :development, :test do
  gem "rspec-rails"
  gem "webmock"
  gem "timecop"
end

group :test do
  gem "shoulda-matchers"
end

group :development do
  gem "rubocop-rails-omakase", require: false
end
```
