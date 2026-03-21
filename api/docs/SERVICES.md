# Services

All business logic lives in `app/services/`. Services are plain Ruby objects with a single public method.

---

## Rules

1. **Plain Old Ruby Objects** — no Rails inheritance, no `include`s from Rails
2. **Single public method: `call`** — returns a `Result` struct
3. **Named by domain + role + `Service` suffix**: `Specs::CreateService`, `Rag::SearchService`
4. **Dependency injection via constructor** — never reach for `ENV`, globals, or singletons inside a service; pass everything in
5. **Stateless** — do not hold mutable state between calls; each `call` is independent
6. **No exceptions for expected failures** — return `Result.new(success: false, error: "...")` instead
7. **Raise only for programmer errors** (wrong argument type, missing required dep)

---

## Result Struct

Every service returns a `Result`. Define it once, use it everywhere:

```ruby
# app/services/result.rb
Result = Struct.new(:success, :payload, :error, keyword_init: true) do
  def success? = success
  def failure? = !success
end
```

### Usage in controllers

```ruby
result = Specs::CreateService.new(spec_params, workspace: @workspace, user: current_user).call

if result.success?
  render json: SpecSerializer.render(result.payload), status: :created
else
  render json: { error: { message: result.error, code: "SPEC_CREATION_FAILED" } },
         status: :unprocessable_entity
end
```

---

## Service Template

```ruby
# app/services/specs/create_service.rb
module Specs
  class CreateService
    def initialize(params, workspace:, user:)
      @params    = params
      @workspace = workspace
      @user      = user
    end

    def call
      spec = @workspace.specs.build(
        @params.merge(created_by: @user, ai_generated: false)
      )

      return Result.new(success: false, error: spec.errors.full_messages.to_sentence) unless spec.save

      Result.new(success: true, payload: spec)
    end
  end
end
```

---

## File Naming + Namespaces

```
app/services/
├── result.rb                          # Result struct — loaded globally
├── specs/
│   ├── create_service.rb              # Specs::CreateService
│   ├── update_service.rb              # Specs::UpdateService
│   ├── destroy_service.rb             # Specs::DestroyService
│   └── list_service.rb                # Specs::ListService
├── tickets/
│   ├── create_service.rb
│   └── prioritize_service.rb
├── workspaces/
│   ├── create_service.rb
│   └── invite_member_service.rb
├── ai/
│   ├── planning_mode_service.rb       # Ai::PlanningModeService
│   ├── spec_generator_service.rb      # Ai::SpecGeneratorService
│   ├── ticket_assistant_service.rb    # Ai::TicketAssistantService
│   └── prioritization_service.rb     # Ai::PrioritizationService
└── rag/
    ├── embedding_service.rb           # Rag::EmbeddingService
    └── search_service.rb              # Rag::SearchService
```

Namespace matches directory structure. `Specs::CreateService` lives at `app/services/specs/create_service.rb`.

---

## Dependency Injection

Pass all external dependencies through the constructor. This makes services trivially testable.

```ruby
# CORRECT — injectable
module Rag
  class EmbeddingService
    VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings"

    def initialize(content:, workspace_id:, source_type:, source_id:, http_client: nil)
      @content      = content
      @workspace_id = workspace_id
      @source_type  = source_type
      @source_id    = source_id
      @http_client  = http_client || default_http_client
    end

    def call
      response = @http_client.post(VOYAGE_API_URL, {
        input: [@content],
        model: "voyage-3-lite",
        input_type: "document"
      })

      return Result.new(success: false, error: "Voyage API error: #{response.status}") unless response.success?

      vector = response.body.dig("data", 0, "embedding")
      embedding = Embedding.create!(
        workspace_id: @workspace_id,
        source_type:  @source_type,
        source_id:    @source_id,
        chunk_index:  0,
        content:      @content,
        embedding:    vector
      )

      Result.new(success: true, payload: embedding)
    rescue StandardError => e
      Result.new(success: false, error: e.message)
    end

    private

    def default_http_client
      Faraday.new do |f|
        f.request :json
        f.response :json
        f.headers["Authorization"] = "Bearer #{ENV.fetch("VOYAGE_API_KEY")}"
      end
    end
  end
end
```

```ruby
# In tests — inject stub
stub_client = instance_double(Faraday::Connection)
allow(stub_client).to receive(:post).and_return(double(success?: true, body: { "data" => [{ "embedding" => [0.1] * 1024 }] }))

service = Rag::EmbeddingService.new(
  content: "Feature spec content",
  workspace_id: @workspace.id,
  source_type: "Spec",
  source_id: @spec.id,
  http_client: stub_client
)
```

---

## AI Streaming Services

Services that stream use a block interface:

```ruby
# app/services/ai/planning_mode_service.rb
module Ai
  class PlanningModeService
    SYSTEM_PROMPT = <<~PROMPT
      You are a senior product manager helping an early-stage startup build the right product.

      Your job is to help clarify and structure product ideas into actionable specifications.

      Rules:
      1. Always ask 2-3 clarifying questions before writing any spec
      2. Reference existing specs and tickets when relevant
      3. When you have enough context, generate a spec using the XML format below
      4. Be concise — early-stage teams move fast

      When ready to generate a spec, use this format:
      <generate_spec>
      <title>Feature title</title>
      <content>Full spec in markdown</content>
      <tickets>
        <ticket><title>Ticket title</title><description>Details</description><story_points>3</story_points></ticket>
      </tickets>
      </generate_spec>
    PROMPT

    def initialize(message:, conversation:, workspace:, user:, anthropic_client: nil)
      @message          = message
      @conversation     = conversation
      @workspace        = workspace
      @user             = user
      @anthropic_client = anthropic_client || Anthropic::Client.new
    end

    def call(&block)
      context = build_context
      messages = build_messages

      @anthropic_client.messages(
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT + context,
        messages: messages,
        stream: block
      )

      @conversation.messages.create!(role: "assistant", content: collect_stream_output)
    end

    private

    def build_context
      rag_results = Rag::SearchService.new(
        query: @message,
        workspace_id: @workspace.id
      ).call

      context_parts = []
      context_parts << "## Workspace Context\n#{@workspace.context.to_json}" if @workspace.context.present?
      context_parts << "## Related Specs & Tickets\n#{rag_results.payload.map(&:content).join("\n\n")}" if rag_results.success? && rag_results.payload.any?

      "\n\n#{context_parts.join("\n\n")}"
    end

    def build_messages
      history = @conversation.messages.order(:created_at).map do |msg|
        { role: msg.role, content: msg.content }
      end
      history + [{ role: "user", content: @message }]
    end
  end
end
```

---

## Testing Services

Service specs live in `spec/services/`. Use WebMock to stub HTTP calls.

```ruby
# spec/services/rag/embedding_service_spec.rb
RSpec.describe Rag::EmbeddingService do
  fixtures :all

  before(:each) do
    @workspace = workspaces(:acme)
    @spec      = specs(:user_auth)

    stub_request(:post, "https://api.voyageai.com/v1/embeddings")
      .to_return(
        status: 200,
        body: { data: [{ embedding: Array.new(1024, 0.1) }] }.to_json,
        headers: { "Content-Type" => "application/json" }
      )
  end

  describe "#call" do
    it "creates an embedding record" do
      expect {
        Rag::EmbeddingService.new(
          content: @spec.content,
          workspace_id: @workspace.id,
          source_type: "Spec",
          source_id: @spec.id
        ).call
      }.to change(Embedding, :count).by(1)
    end

    it "returns a successful result" do
      result = Rag::EmbeddingService.new(
        content: @spec.content,
        workspace_id: @workspace.id,
        source_type: "Spec",
        source_id: @spec.id
      ).call

      expect(result).to be_success
      expect(result.payload).to be_a(Embedding)
    end
  end
end
```
