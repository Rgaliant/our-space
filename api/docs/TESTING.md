# Testing (RSpec)

All tests use RSpec with YAML fixtures. No FactoryBot. No `let`. No random data.

---

## The Rules

1. **Request specs only** — no controller specs (deprecated in Rails)
2. **Fixtures only** — all test data in `spec/fixtures/*.yml`; no FactoryBot, no inline `create()`
3. **No `let` or `let!`** — use `before(:each)` with instance variables
4. **No `before(:all)`** — use `before(:each)` only (database state resets between examples)
5. **No random data** — fixtures are static, deterministic, descriptively named
6. **`travel_to` for time-dependent tests** — never use bare `Time.now` or `Time.current` in assertions
7. **`describe` for class/method**, `context` for conditions, `it` for assertions
8. **Spec file mirrors app/ structure exactly** — `app/services/specs/create_service.rb` → `spec/services/specs/create_service_spec.rb`
9. **WebMock** for all external HTTP (Voyage AI, Clerk, Anthropic)
10. **Shared examples** for: auth requirements, workspace authorization, pagination

---

## Setup

```ruby
# spec/rails_helper.rb
require "spec_helper"
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rspec/rails"

Dir[Rails.root.join("spec/support/**/*.rb")].each { |f| require f }

RSpec.configure do |config|
  config.fixture_paths = ["#{::Rails.root}/spec/fixtures"]
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!

  config.include ClerkHelpers
  config.include Shoulda::Matchers::ActiveRecord,  type: :model
  config.include Shoulda::Matchers::ActiveModel,   type: :model
end
```

---

## Test Pattern: Request Specs

```ruby
# spec/requests/api/v1/specs_spec.rb
RSpec.describe "API::V1::Specs", type: :request do
  fixtures :all

  before(:each) do
    @workspace = workspaces(:acme)
    @project   = projects(:mobile_app)
    @user      = users(:john)
    @headers   = clerk_auth_headers(@user.id)
  end

  describe "GET /api/v1/workspaces/:workspace_slug/projects/:project_id/specs" do
    context "when authenticated" do
      it "returns all specs for the project" do
        get "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs",
            headers: @headers

        expect(response).to have_http_status(:ok)
        expect(json_body["data"]).to be_an(Array)
      end
    end

    context "when unauthenticated" do
      it "returns 401" do
        get "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs"
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "when user is not a workspace member" do
      it "returns 404" do
        other_user = users(:outsider)
        get "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs",
            headers: clerk_auth_headers(other_user.id)
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe "POST /api/v1/workspaces/:workspace_slug/projects/:project_id/specs" do
    context "when authenticated" do
      it "creates a spec and returns 201" do
        expect {
          post "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs",
               params: { spec: { title: "Notification System", content: "## Overview\nUsers need notifications." } },
               headers: @headers
        }.to change(Spec, :count).by(1)

        expect(response).to have_http_status(:created)
        expect(json_body.dig("data", "title")).to eq("Notification System")
      end

      it "returns 422 when title is blank" do
        post "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs",
             params: { spec: { title: "", content: "content" } },
             headers: @headers

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json_body.dig("error", "code")).to eq("SPEC_CREATION_FAILED")
      end
    end
  end

  describe "DELETE /api/v1/workspaces/:workspace_slug/projects/:project_id/specs/:id" do
    context "when authenticated" do
      it "destroys the spec and returns 204" do
        spec = specs(:user_auth)

        expect {
          delete "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs/#{spec.id}",
                 headers: @headers
        }.to change(Spec, :count).by(-1)

        expect(response).to have_http_status(:no_content)
      end
    end
  end
end
```

---

## Test Pattern: Service Specs

```ruby
# spec/services/specs/create_service_spec.rb
RSpec.describe Specs::CreateService do
  fixtures :all

  before(:each) do
    @workspace = workspaces(:acme)
    @project   = projects(:mobile_app)
    @user      = users(:john)
    @params    = { title: "Notification System", content: "Users need push notifications." }
  end

  describe "#call" do
    it "returns a successful result with the created spec" do
      result = Specs::CreateService.new(@params, workspace: @workspace, user: @user).call

      expect(result).to be_success
      expect(result.payload).to be_a(Spec)
      expect(result.payload.title).to eq("Notification System")
    end

    it "persists the spec to the database" do
      expect {
        Specs::CreateService.new(@params, workspace: @workspace, user: @user).call
      }.to change(Spec, :count).by(1)
    end

    it "returns failure when title is blank" do
      result = Specs::CreateService.new({ title: "", content: "content" }, workspace: @workspace, user: @user).call

      expect(result).to be_failure
      expect(result.error).to be_present
    end
  end
end
```

---

## Test Pattern: Model Specs

```ruby
# spec/models/ticket_spec.rb
RSpec.describe Ticket, type: :model do
  fixtures :all

  before(:each) do
    @workspace = workspaces(:acme)
    @project   = projects(:mobile_app)
    @user      = users(:john)
    @ticket    = tickets(:login_bug)
  end

  describe "validations" do
    it { should validate_presence_of(:title) }
    it { should validate_inclusion_of(:status).in_array(Ticket::STATUSES) }
    it { should validate_inclusion_of(:priority).in_array(Ticket::PRIORITIES) }
  end

  describe "associations" do
    it { should belong_to(:workspace) }
    it { should belong_to(:project) }
    it { should belong_to(:spec).optional }
    it { should belong_to(:assignee).optional }
  end

  describe ".for_engineer" do
    it "returns todo and in_progress tickets for the user" do
      result = Ticket.for_engineer(@user)
      expect(result).to include(@ticket)
    end
  end
end
```

---

## Fixtures

All test data is in `spec/fixtures/*.yml`. Every fixture has a descriptive name. No sequential numbers (`user1`, `user2`).

```yaml
# spec/fixtures/users.yml
john:
  id: "user_2abc123xyz"
  email: "john@acme.com"
  display_name: "John Smith"
  avatar_url: "https://example.com/avatars/john.jpg"

jane:
  id: "user_2def456uvw"
  email: "jane@acme.com"
  display_name: "Jane Doe"
  avatar_url: ~

outsider:
  id: "user_2ghi789rst"
  email: "outsider@other.com"
  display_name: "Outside User"
  avatar_url: ~
```

```yaml
# spec/fixtures/workspaces.yml
acme:
  owner: john
  name: "Acme Corp"
  slug: "acme"
  plan: "pro"
  context: '{"industry":"SaaS","stage":"seed","team_size":12}'

startup_xyz:
  owner: jane
  name: "Startup XYZ"
  slug: "startup-xyz"
  plan: "free"
  context: ~
```

```yaml
# spec/fixtures/workspace_members.yml
john_acme_owner:
  workspace: acme
  user: john
  role: "owner"

jane_acme_engineer:
  workspace: acme
  user: jane
  role: "engineer"
```

```yaml
# spec/fixtures/projects.yml
mobile_app:
  workspace: acme
  name: "Mobile App"
  description: "iOS and Android apps"
  status: "active"
```

```yaml
# spec/fixtures/specs.yml
user_auth:
  workspace: acme
  project: mobile_app
  created_by: john
  title: "User Authentication"
  content: "## Overview\nUsers need to sign in with email or Google."
  status: "approved"
  ai_generated: false
```

```yaml
# spec/fixtures/tickets.yml
login_bug:
  workspace: acme
  project: mobile_app
  spec: user_auth
  created_by: john
  assignee: jane
  title: "Fix login redirect bug"
  description: "After login, users are redirected to 404"
  status: "in_progress"
  priority: "high"
  story_points: 3
  position: 1
```

---

## Clerk Auth Helper

```ruby
# spec/support/clerk_helpers.rb
module ClerkHelpers
  # Returns headers that stub Clerk authentication in tests.
  # ApplicationController reads X-Clerk-User-Id in test mode
  # instead of verifying a real JWT.
  def clerk_auth_headers(user_id)
    { "X-Clerk-User-Id" => user_id }
  end
end
```

```ruby
# config/initializers/clerk.rb (test mode stub)
if Rails.env.test?
  # In test, ApplicationController reads X-Clerk-User-Id header directly
  # No JWT verification needed
  ApplicationController.class_eval do
    def require_clerk_session!
      user_id = request.headers["X-Clerk-User-Id"]
      return head :unauthorized unless user_id.present?
      @_clerk_user_id = user_id
    end

    def clerk_session
      OpenStruct.new(user_id: @_clerk_user_id)
    end
  end
end
```

---

## Shared Examples

```ruby
# spec/support/shared_examples/authenticated_endpoint.rb
RSpec.shared_examples "an authenticated endpoint" do |method, path_proc|
  it "returns 401 when no auth headers provided" do
    send(method, instance_exec(&path_proc))
    expect(response).to have_http_status(:unauthorized)
  end
end

# Usage in a request spec:
it_behaves_like "an authenticated endpoint", :get, -> { "/api/v1/workspaces/#{@workspace.slug}/projects" }
```

---

## Time-Dependent Tests

```ruby
# Use travel_to — never bare Time.now
describe "when spec was created yesterday" do
  it "shows correct created_at in response" do
    travel_to(1.day.ago) do
      post "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs",
           params: { spec: { title: "Yesterday Spec", content: "content" } },
           headers: @headers
    end

    spec = Spec.last
    expect(spec.created_at).to be < Time.current
  end
end
```

---

## WebMock for External Services

```ruby
# spec/support/webmock.rb
require "webmock/rspec"

WebMock.disable_net_connect!(allow_localhost: true)

# Stub Voyage AI embeddings globally
RSpec.configure do |config|
  config.before(:each) do
    stub_request(:post, "https://api.voyageai.com/v1/embeddings")
      .to_return(
        status: 200,
        body: { data: [{ embedding: Array.new(1024, 0.0) }] }.to_json,
        headers: { "Content-Type" => "application/json" }
      )
  end
end
```

---

## Helper: `json_body`

```ruby
# spec/support/json_helpers.rb
module JsonHelpers
  def json_body
    JSON.parse(response.body)
  end
end

RSpec.configure do |config|
  config.include JsonHelpers, type: :request
end
```
