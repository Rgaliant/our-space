# Error Handling

All errors are caught in `ApplicationController` via `rescue_from`. No begin/rescue in controller actions.

---

## API Error Response Format

Every error response follows this exact shape:

```json
{
  "error": {
    "message": "Human-readable description of what went wrong",
    "code": "SNAKE_CASE_ERROR_CODE",
    "details": {}
  }
}
```

- `message` — human-readable, suitable for display or logging
- `code` — machine-readable, SCREAMING_SNAKE_CASE, stable across versions
- `details` — optional hash with additional context (validation errors, field names, etc.)

---

## HTTP Status Codes

| Status | When to use |
|--------|-------------|
| `200` | Successful GET, PATCH, PUT |
| `201` | Successful POST (resource created) |
| `204` | Successful DELETE (no body) |
| `400` | Malformed request (bad params structure, invalid JSON) |
| `401` | Not authenticated (missing/invalid Clerk JWT) |
| `403` | Authenticated but not authorized (wrong workspace, wrong role) |
| `404` | Record not found (`ActiveRecord::RecordNotFound`) |
| `422` | Validation failure (`ActiveRecord::RecordInvalid`, service failure) |
| `429` | Rate limited (Rack::Attack) |
| `500` | Unexpected server error |

---

## `ApplicationController` — Full Error Handling

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  include Clerk::Authenticatable
  before_action :require_clerk_session!

  # Order matters — most specific first
  rescue_from ActionController::ParameterMissing,  with: :handle_bad_request
  rescue_from ActiveRecord::RecordNotFound,         with: :handle_not_found
  rescue_from ActiveRecord::RecordInvalid,          with: :handle_unprocessable
  rescue_from Clerk::AuthenticationError,           with: :handle_unauthorized
  rescue_from StandardError,                        with: :handle_server_error

  private

  def current_user
    @current_user ||= User.find(clerk_session.user_id)
  end

  def handle_bad_request(e)
    render json: {
      error: { message: e.message, code: "BAD_REQUEST" }
    }, status: :bad_request
  end

  def handle_not_found(e)
    render json: {
      error: { message: "Resource not found", code: "NOT_FOUND" }
    }, status: :not_found
  end

  def handle_unprocessable(e)
    render json: {
      error: { message: e.message, code: "VALIDATION_FAILED" }
    }, status: :unprocessable_entity
  end

  def handle_unauthorized(e)
    render json: {
      error: { message: "Authentication required", code: "UNAUTHORIZED" }
    }, status: :unauthorized
  end

  def handle_server_error(e)
    Rails.logger.error("Unhandled #{e.class}: #{e.message}\n#{e.backtrace&.first(10)&.join("\n")}")
    render json: {
      error: { message: "Internal server error", code: "INTERNAL_ERROR" }
    }, status: :internal_server_error
  end
end
```

---

## Error Codes Reference

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid Clerk JWT |
| `FORBIDDEN` | 403 | Not a workspace member, or insufficient role |
| `NOT_FOUND` | 404 | Record not found or not accessible |
| `BAD_REQUEST` | 400 | Missing required params, malformed body |
| `VALIDATION_FAILED` | 422 | Model validation errors |
| `SPEC_CREATION_FAILED` | 422 | Spec service failure |
| `SPEC_UPDATE_FAILED` | 422 | Spec update service failure |
| `TICKET_CREATION_FAILED` | 422 | Ticket service failure |
| `WORKSPACE_CREATION_FAILED` | 422 | Workspace service failure |
| `AI_GENERATION_FAILED` | 422 | AI service error (non-streaming) |
| `RATE_LIMITED` | 429 | Too many requests (Rack::Attack) |
| `INTERNAL_ERROR` | 500 | Unexpected error |

---

## Service Errors vs. System Errors

Services return `Result.new(success: false, error: "message")` for expected failures (validation, business rule). Controllers convert these to 422 responses.

Reserve exceptions for unexpected, unrecoverable situations (network down, database unavailable). These bubble up to `rescue_from StandardError`.

```ruby
# CORRECT — service returns Result for expected failure
def call
  return Result.new(success: false, error: "Workspace at capacity") if @workspace.at_member_limit?

  # ...
end

# CORRECT — controller handles both cases
def create
  result = Workspaces::InviteMemberService.new(invite_params, workspace: @workspace).call
  if result.success?
    render json: WorkspaceMemberSerializer.render(result.payload), status: :created
  else
    render json: { error: { message: result.error, code: "INVITE_FAILED" } },
           status: :unprocessable_entity
  end
end
```

---

## Validation Errors with Field Details

When returning validation errors, include field-level detail in `details`:

```ruby
# In a service
if model.invalid?
  return Result.new(
    success: false,
    error: model.errors.full_messages.to_sentence,
    payload: { details: model.errors.as_json }
  )
end
```

```ruby
# In the controller
render json: {
  error: {
    message: result.error,
    code: "VALIDATION_FAILED",
    details: result.payload&.dig(:details) || {}
  }
}, status: :unprocessable_entity
```

Response:
```json
{
  "error": {
    "message": "Title can't be blank, Content can't be blank",
    "code": "VALIDATION_FAILED",
    "details": {
      "title": [{ "error": "blank" }],
      "content": [{ "error": "blank" }]
    }
  }
}
```

---

## Rate Limiting (Rack::Attack)

```ruby
# config/initializers/rack_attack.rb
class Rack::Attack
  cache.store = ActiveSupport::Cache::MemoryStore.new

  # General API: 120 req/min per IP
  throttle("api/ip", limit: 120, period: 1.minute) do |req|
    req.ip if req.path.start_with?("/api/")
  end

  # AI endpoints: 10 req/min per authenticated user
  throttle("ai/user", limit: 10, period: 1.minute) do |req|
    if req.path.start_with?("/api/v1/") && req.path.include?("/ai/") && req.post?
      req.env["HTTP_X_CLERK_USER_ID"] || req.ip
    end
  end

  # Webhooks: 30 req/min per IP
  throttle("webhooks/ip", limit: 30, period: 1.minute) do |req|
    req.ip if req.path.start_with?("/webhooks/")
  end

  self.throttled_responder = lambda do |req|
    env = req.respond_to?(:env) ? req.env : req
    retry_after = (env["rack.attack.match_data"] || {})[:period]
    [
      429,
      { "Content-Type" => "application/json", "Retry-After" => retry_after.to_s },
      [{ error: { message: "Too many requests", code: "RATE_LIMITED", details: { retry_after: retry_after } } }.to_json]
    ]
  end
end
```

---

## AI / Streaming Error Handling

SSE streaming endpoints need special error handling because headers are already sent by the time an error occurs:

```ruby
# app/controllers/api/v1/ai/plan_controller.rb
def create
  sse = SSE.new(response.stream, event: "message")

  Ai::PlanningModeService.new(...).call do |chunk|
    sse.write({ type: "chunk", content: chunk }.to_json)
  end

  sse.write({ type: "done" }.to_json)
rescue Anthropic::APIError => e
  sse.write({ type: "error", error: { message: "AI service error", code: "AI_ERROR" } }.to_json)
rescue ActionController::Live::ClientDisconnected
  # Normal — client closed the connection
ensure
  sse.close
end
```

Frontend expects these SSE event types:
- `{ type: "chunk", content: "..." }` — streamed text chunk
- `{ type: "done" }` — stream complete
- `{ type: "error", error: { message, code } }` — stream error
- `{ type: "spec_created", spec: { id, title } }` — spec was generated and saved
