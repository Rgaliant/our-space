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
      # Save user message
      @conversation.messages.create!(role: "user", content: @message)

      # Build message history for Claude
      messages = build_messages

      # Stream from Claude
      full_response = ""
      client.messages.stream(
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: messages
      ) do |event|
        if event.type == "content_block_delta" && event.delta.type == "text_delta"
          chunk = event.delta.text
          full_response += chunk
          block.call(chunk) if block
        end
      end

      # Save assistant message
      @conversation.messages.create!(role: "assistant", content: full_response)

      # Parse and create spec if XML tag present
      if full_response.include?("<generate_spec>")
        Ai::SpecGeneratorService.new(full_response, project: @project, user: @user).call
      end

      Result.new(success: true, payload: full_response)
    rescue Anthropic::Error => e
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
