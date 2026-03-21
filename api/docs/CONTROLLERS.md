# Controllers

Controllers are **thin dispatchers**. Their only job: authenticate → authorize → call service → render.

---

## Rules

1. Inherit from `ApplicationController < ActionController::API`
2. Max 5 public actions per controller: `index`, `show`, `create`, `update`, `destroy`
3. **Zero business logic** — no AR queries, no conditionals on domain objects
4. Use `params.expect()` (Rails 8) — **never** `params.require().permit()`
5. `before_action` only for: `require_clerk_session!` (inherited) and loading records by ID
6. Never call ActiveRecord directly in an action — delegate to service or model scope
7. All errors handled by `rescue_from` in `ApplicationController` — no begin/rescue in actions

---

## `ApplicationController`

```ruby
# app/controllers/application_controller.rb
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

  def handle_server_error(e)
    Rails.logger.error("Unhandled error: #{e.class}: #{e.message}\n#{e.backtrace&.first(5)&.join("\n")}")
    render json: { error: { message: "Internal server error", code: "INTERNAL_ERROR" } },
           status: :internal_server_error
  end

  def handle_not_found(e)
    render json: { error: { message: e.message, code: "NOT_FOUND" } }, status: :not_found
  end

  def handle_unprocessable(e)
    render json: { error: { message: e.message, code: "VALIDATION_FAILED" } },
           status: :unprocessable_entity
  end
end
```

---

## Standard CRUD Controller

```ruby
# app/controllers/api/v1/specs_controller.rb
module Api
  module V1
    class SpecsController < ApplicationController
      before_action :set_workspace
      before_action :set_spec, only: [:show, :update, :destroy]

      def index
        result = Specs::ListService.new(workspace: @workspace).call
        render json: SpecSerializer.render(result.payload)
      end

      def show
        render json: SpecSerializer.render_as_hash(@spec)
      end

      def create
        result = Specs::CreateService.new(spec_params, workspace: @workspace, user: current_user).call
        if result.success?
          render json: SpecSerializer.render(result.payload), status: :created
        else
          render json: { error: { message: result.error, code: "SPEC_CREATION_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      def update
        result = Specs::UpdateService.new(@spec, spec_params).call
        if result.success?
          render json: SpecSerializer.render(result.payload)
        else
          render json: { error: { message: result.error, code: "SPEC_UPDATE_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      def destroy
        Specs::DestroyService.new(@spec).call
        head :no_content
      end

      private

      def spec_params
        params.expect(spec: [:title, :content, :status])
      end

      def set_workspace
        @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
      end

      def set_spec
        @spec = @workspace.specs.find(params[:id])
      end
    end
  end
end
```

---

## `params.expect()` vs `params.require().permit()` (Rails 8)

Always use `params.expect()`. It is stricter and raises `ActionController::ParameterMissing` on missing required keys.

```ruby
# CORRECT (Rails 8)
def spec_params
  params.expect(spec: [:title, :content, :status])
end

def ticket_params
  params.expect(ticket: [:title, :description, :status, :priority, :story_points])
end

# WRONG — never use this
def spec_params
  params.require(:spec).permit(:title, :content, :status)
end
```

---

## Routes

```ruby
# config/routes.rb
Rails.application.routes.draw do
  get "/up", to: "rails/health#show"       # Cloud Run health check

  post "/webhooks/clerk", to: "webhooks#clerk"

  namespace :api do
    namespace :v1 do
      get "me", to: "auth/me#show"

      resources :workspaces, param: :slug do
        resources :projects do
          resources :specs do
            resources :tickets
          end
          resources :feedback, only: [:index, :create, :show, :destroy]
        end
        resources :conversations do
          resources :messages, only: [:index, :create], controller: "conversation_messages"
        end
        namespace :ai do
          post "plan",   to: "plan#create"
          post "ticket", to: "ticket#create"
        end
      end
    end
  end
end
```

---

## SSE (Streaming) Controllers

AI endpoints stream via `ActionController::Live`:

```ruby
# app/controllers/api/v1/ai/plan_controller.rb
module Api
  module V1
    module Ai
      class PlanController < ApplicationController
        include ActionController::Live

        def create
          response.headers["Content-Type"] = "text/event-stream"
          response.headers["Cache-Control"] = "no-cache"
          response.headers["X-Accel-Buffering"] = "no"
          sse = SSE.new(response.stream, event: "message")

          workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
          conversation = workspace.conversations.find(params[:conversation_id])

          Ai::PlanningModeService.new(
            message: plan_params[:message],
            conversation: conversation,
            workspace: workspace,
            user: current_user
          ).call do |chunk|
            sse.write({ content: chunk }.to_json)
          end
        rescue ActionController::Live::ClientDisconnected
          # Client disconnected — normal, no-op
        ensure
          sse.close
        end

        private

        def plan_params
          params.expect(plan: [:message, :conversation_id])
        end
      end
    end
  end
end
```

---

## Webhooks Controller

```ruby
# app/controllers/webhooks_controller.rb
class WebhooksController < ApplicationController
  skip_before_action :require_clerk_session!

  def clerk
    payload = request.body.read
    headers = {
      "svix-id"        => request.headers["svix-id"],
      "svix-timestamp" => request.headers["svix-timestamp"],
      "svix-signature" => request.headers["svix-signature"]
    }

    begin
      wh = Svix::Webhook.new(ENV.fetch("CLERK_WEBHOOK_SECRET"))
      event = wh.verify(payload, headers)
    rescue Svix::WebhookVerificationError
      return render json: { error: { message: "Invalid signature", code: "INVALID_SIGNATURE" } },
                    status: :bad_request
    end

    case event["type"]
    when "user.created", "user.updated"
      sync_user(event["data"])
    end

    head :ok
  end

  private

  def sync_user(data)
    User.upsert(
      {
        id:           data["id"],
        email:        data["email_addresses"].first["email_address"],
        display_name: [data["first_name"], data["last_name"]].compact.join(" ").presence,
        avatar_url:   data["image_url"]
      },
      unique_by: :id
    )
  end
end
```

---

## Before Actions

Only two types of `before_action` are permitted:

```ruby
# 1. Auth (inherited from ApplicationController — do not redeclare)
before_action :require_clerk_session!

# 2. Loading a record by ID from a URL param
before_action :set_workspace
before_action :set_spec, only: [:show, :update, :destroy]

private

def set_workspace
  # Always scope to current_user for authorization
  @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
end

def set_spec
  @spec = @workspace.specs.find(params[:id])
end
```

Never use `before_action` for business logic, conditional rendering, or anything that belongs in a service.
