module Ai
  class PlanningModeService
    SYSTEM_PROMPT = <<~PROMPT.freeze
      You are an expert AI product manager helping an early-stage startup define features.

      Your job is to have a focused conversation to understand what they want to build, then produce a structured spec.

      Rules:
      1. Ask clarifying questions one at a time. Do not overwhelm.
      2. When you have enough information (3-5 exchanges minimum), produce the spec.
      3. To produce the spec, emit EXACTLY this XML block (nothing else after it):

      <generate_spec>
      <title>Feature title here</title>
      <content>Full markdown spec content here. Include: ## Overview, ## User Stories, ## Acceptance Criteria, ## Technical Notes</content>
      <tickets>
      <ticket><title>Ticket title</title><priority>medium</priority><story_points>3</story_points><description>What needs to be done</description></ticket>
      </tickets>
      </generate_spec>

      4. Priorities: low, medium, high, critical
      5. Story points: 1, 2, 3, 5, 8, 13
    PROMPT

    def initialize(message, conversation:, workspace:, project:, user:)
      @message = message
      @conversation = conversation
      @workspace = workspace
      @project = project
      @user = user
    end

    def call(&block)
      @conversation.messages.create!(role: "user", content: @message)

      messages = build_messages
      full_response = ""

      stream = client.messages.stream(
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: messages
      )

      stream.text.each do |chunk|
        full_response += chunk
        block.call(chunk) if block
      end

      stream.until_done

      @conversation.messages.create!(role: "assistant", content: full_response)

      spec = nil
      if full_response.include?("<generate_spec>") && @project
        spec_result = ::Ai::SpecGeneratorService.new(full_response, project: @project, user: @user).call
        spec = spec_result.payload if spec_result.success?
      end

      Result.new(success: true, payload: { response: full_response, spec: spec })
    rescue Anthropic::Errors::Error => e
      Result.new(success: false, error: "AI error: #{e.message}")
    end

    private

    def build_messages
      @conversation.messages.order(:created_at).map do |msg|
        { role: msg.role, content: msg.content }
      end
    end

    def client
      @client ||= Anthropic::Client.new(api_key: ENV.fetch("ANTHROPIC_API_KEY", "placeholder"))
    end
  end
end
