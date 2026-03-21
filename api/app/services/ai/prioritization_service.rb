module Ai
  class PrioritizationService
    SYSTEM_PROMPT = <<~PROMPT.freeze
      You are a technical product manager. Score each ticket by priority using these factors:
      - Business impact (0-10)
      - Technical risk (0-10)
      - User-facing impact (0-10)
      - Dependencies blocking other work (0-10)

      Respond with ONLY valid JSON: {"scores": [{"id": <ticket_id>, "score": <0.0-1.0>, "reasoning": "<one sentence>"}]}
      Do not include any other text.
    PROMPT

    def initialize(project, user:)
      @project = project
      @user = user
    end

    def call
      tickets = @project.tickets.backlog.includes(:spec).limit(50)
      return Result.new(success: true, payload: []) if tickets.empty?

      ticket_list = tickets.map { |t| { id: t.id, title: t.title, description: t.description } }

      response = client.messages.create(
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: "Score these tickets:\n#{ticket_list.to_json}"
          }
        ]
      )

      scores = JSON.parse(response.content.first.text)["scores"]
      update_scores(scores, tickets)

      Result.new(success: true, payload: scores)
    rescue JSON::ParserError => e
      Result.new(success: false, error: "Failed to parse AI response: #{e.message}")
    rescue Anthropic::Error => e
      Result.new(success: false, error: "AI error: #{e.message}")
    end

    private

    def update_scores(scores, tickets)
      ticket_map = tickets.index_by(&:id)
      scores.each do |score_data|
        ticket = ticket_map[score_data["id"].to_i]
        ticket&.update_columns(priority_score: score_data["score"])
      end
    end

    def client
      @client ||= Anthropic::Client.new(api_key: ENV.fetch("ANTHROPIC_API_KEY", "placeholder"))
    end
  end
end
