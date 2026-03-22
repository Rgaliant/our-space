module Ai
  class TicketAssistantService
    def initialize(message, ticket:, workspace:, user:)
      @message = message
      @ticket = ticket
      @workspace = workspace
      @user = user
    end

    def call(&block)
      system_prompt = build_system_prompt

      full_response = ""
      stream = client.messages.stream(
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: system_prompt,
        messages: [ { role: "user", content: @message } ]
      )

      stream.text.each do |chunk|
        full_response += chunk
        block.call(chunk) if block
      end

      stream.until_done

      Result.new(success: true, payload: full_response)
    rescue Anthropic::Errors::Error => e
      Result.new(success: false, error: "AI error: #{e.message}")
    end

    private

    def build_system_prompt
      spec_context = build_spec_context
      rag_context = build_rag_context

      <<~PROMPT
        You are a senior engineer assistant helping with a specific ticket.

        ## Ticket
        Title: #{@ticket.title}
        Status: #{@ticket.status}
        Priority: #{@ticket.priority}
        Story Points: #{@ticket.story_points}
        Description: #{@ticket.description}

        #{spec_context}

        #{rag_context}

        Answer questions about this ticket concisely and technically.
        If you suggest code, make it production-quality.
      PROMPT
    end

    def build_spec_context
      return "" unless @ticket.spec

      <<~CONTEXT
        ## Spec: #{@ticket.spec.title}
        #{@ticket.spec.content}
      CONTEXT
    end

    def build_rag_context
      rag_result = Rag::SearchService.new(
        "#{@ticket.title} #{@ticket.description}",
        workspace: @workspace,
        source_types: %w[Spec Ticket],
        limit: 3
      ).call
      return "" unless rag_result.success? && rag_result.payload.any?

      snippets = rag_result.payload.map { |e| "- #{e.content.truncate(200)}" }.join("\n")
      "## Related Context\n#{snippets}"
    rescue StandardError
      ""
    end

    def client
      @client ||= Anthropic::Client.new(api_key: ENV.fetch("ANTHROPIC_API_KEY", "placeholder"))
    end
  end
end
