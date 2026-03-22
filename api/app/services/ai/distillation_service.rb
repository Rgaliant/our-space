module Ai
  class DistillationService
    SYSTEM_PROMPT = <<~PROMPT.freeze
      You are a strategic technical advisor for an early-stage startup. You will receive the CEO's current focus statement and their full workspace (tickets and specs). Produce a distillation that restructures priorities around the stated goal.

      Respond ONLY with valid XML in the exact format specified. No preamble, no explanation outside the XML.
    PROMPT

    RESPONSE_FORMAT = <<~FORMAT.freeze
      Respond ONLY with this XML structure:
      <distillation>
        <plan_content>## Focus Areas\n\n[Markdown plan: focus areas, what each means in engineering terms, which existing specs address them. Be specific and actionable. 200-400 words.]</plan_content>
        <misaligned_tickets>
          <ticket><id>[ticket_id]</id><reason>[one-line reason why it doesn't serve the north star right now]</reason></ticket>
        </misaligned_tickets>
        <proposed_tickets>
          <ticket>
            <title>[concise ticket title]</title>
            <description>[what needs to be done, 1-2 sentences]</description>
            <priority>[low|medium|high|critical]</priority>
            <story_points>[1|2|3|5|8|13]</story_points>
            <project_id>[project_id from the tickets list, pick the most relevant one]</project_id>
          </ticket>
        </proposed_tickets>
      </distillation>

      Rules:
      - Misaligned tickets: include only tickets that actively distract from the north star. Leave out tickets that are neutral.
      - Proposed tickets: suggest 2-5 net-new tickets that are missing but needed to achieve the north star. Only suggest if genuinely missing.
      - If there are no misaligned tickets or no proposed tickets, leave those sections empty (but include the tags).
    FORMAT

    def initialize(north_star, workspace:, user:)
      @north_star = north_star
      @workspace = workspace
      @user = user
      @emitted_plan_done = false
      @emitted_misaligned_count = 0
      @emitted_proposed_count = 0
    end

    def call(&block)
      yield_event(block, { type: "phase", label: "Analyzing your workspace..." })

      tickets = load_tickets
      specs = load_specs

      full_response = ""

      stream = client.messages.stream(
        model: "claude-sonnet-4-6",
        max_tokens: 8096,
        system: SYSTEM_PROMPT,
        messages: [ { role: "user", content: build_user_message(tickets, specs) } ]
      )

      stream.text.each do |chunk|
        full_response += chunk
        yield_event(block, { type: "chunk", content: chunk })
        detect_and_emit(full_response, tickets, block)
      end

      stream.until_done

      # Final pass — emit anything not yet emitted
      detect_and_emit(full_response, tickets, block)

      parsed = parse_response(full_response)
      distillation = persist(parsed)

      @workspace.update!(
        context: @workspace.context.merge(
          "north_star" => @north_star,
          "north_star_updated_at" => Time.current.iso8601
        )
      )

      EmbedRecordJob.perform_later("Distillation", distillation.id)

      yield_event(block, { type: "distillation_created", id: distillation.id })
      Result.new(success: true, payload: distillation)
    rescue Anthropic::Errors::Error => e
      Result.new(success: false, error: "AI error: #{e.message}")
    end

    private

    def detect_and_emit(full_response, tickets, block)
      emit_plan_done(full_response, block)
      emit_misaligned_tickets(full_response, tickets, block)
      emit_proposed_tickets(full_response, block)
    end

    def emit_plan_done(full_response, block)
      return if @emitted_plan_done
      return unless full_response.include?("</plan_content>")

      yield_event(block, { type: "plan_done" })
      @emitted_plan_done = true
    end

    def emit_misaligned_tickets(full_response, tickets, block)
      return unless full_response.include?("<misaligned_tickets>")

      ticket_map = tickets.index_by { |t| t.id.to_s }

      start_idx = full_response.index("<misaligned_tickets>")
      end_tag = "</misaligned_tickets>"
      end_idx = full_response.include?(end_tag) ? full_response.index(end_tag) + end_tag.length : full_response.length
      section = full_response[start_idx...end_idx]

      ticket_blocks = section.scan(/<ticket>(.*?)<\/ticket>/m)
      ticket_blocks.drop(@emitted_misaligned_count).each do |match|
        content = match[0]
        id_match = content.match(/<id>(\d+)<\/id>/)
        reason_match = content.match(/<reason>(.*?)<\/reason>/m)
        next unless id_match && reason_match

        id = id_match[1]
        reason = reason_match[1].strip
        ticket = ticket_map[id]

        yield_event(block, {
          type: "misaligned_ticket",
          id: id,
          title: ticket&.title || "Ticket ##{id}",
          reason: reason
        })
        @emitted_misaligned_count += 1
      end
    end

    def emit_proposed_tickets(full_response, block)
      return unless full_response.include?("<proposed_tickets>")

      start_idx = full_response.index("<proposed_tickets>")
      end_tag = "</proposed_tickets>"
      end_idx = full_response.include?(end_tag) ? full_response.index(end_tag) + end_tag.length : full_response.length
      section = full_response[start_idx...end_idx]

      ticket_blocks = section.scan(/<ticket>(.*?)<\/ticket>/m)
      ticket_blocks.drop(@emitted_proposed_count).each do |match|
        content = match[0]
        title = content.match(/<title>(.*?)<\/title>/m)&.[](1)&.strip
        next unless title

        yield_event(block, {
          type: "proposed_ticket",
          title: title,
          description: content.match(/<description>(.*?)<\/description>/m)&.[](1)&.strip,
          priority: content.match(/<priority>(.*?)<\/priority>/m)&.[](1)&.strip || "medium",
          story_points: content.match(/<story_points>(\d+)<\/story_points>/)&.[](1)&.to_i,
          project_id: content.match(/<project_id>(\d+)<\/project_id>/)&.[](1)
        })
        @emitted_proposed_count += 1
      end
    end

    def parse_response(full_response)
      plan_content = full_response.match(/<plan_content>(.*?)<\/plan_content>/m)&.[](1)&.strip

      misaligned_ids = []
      if (section = full_response.match(/<misaligned_tickets>(.*?)<\/misaligned_tickets>/m)&.[](1))
        misaligned_ids = section.scan(/<id>(\d+)<\/id>/).flatten.map(&:to_i)
      end

      proposed_tickets = []
      if (section = full_response.match(/<proposed_tickets>(.*?)<\/proposed_tickets>/m)&.[](1))
        section.scan(/<ticket>(.*?)<\/ticket>/m).each do |match|
          content = match[0]
          title = content.match(/<title>(.*?)<\/title>/m)&.[](1)&.strip
          next unless title

          proposed_tickets << {
            "title" => title,
            "description" => content.match(/<description>(.*?)<\/description>/m)&.[](1)&.strip,
            "priority" => content.match(/<priority>(.*?)<\/priority>/m)&.[](1)&.strip || "medium",
            "story_points" => content.match(/<story_points>(\d+)<\/story_points>/)&.[](1)&.to_i,
            "project_id" => content.match(/<project_id>(\d+)<\/project_id>/)&.[](1)
          }.compact
        end
      end

      { plan_content: plan_content, misaligned_ticket_ids: misaligned_ids, proposed_tickets: proposed_tickets }
    end

    def persist(parsed)
      @workspace.distillations.create!(
        created_by_id: @user.id,
        north_star: @north_star,
        plan_content: parsed[:plan_content],
        proposed_tickets: parsed[:proposed_tickets],
        misaligned_ticket_ids: parsed[:misaligned_ticket_ids],
        status: "complete"
      )
    end

    def load_tickets
      @workspace.projects.where(status: "active").flat_map do |project|
        project.tickets.where.not(status: "done").includes(:project).limit(50).to_a
      end.first(100)
    end

    def load_specs
      @workspace.projects.where(status: "active").flat_map do |project|
        project.specs.where(status: %w[draft review approved]).limit(20).to_a
      end.first(50)
    end

    def build_user_message(tickets, specs)
      ticket_list = tickets.map do |t|
        { id: t.id, title: t.title, description: t.description&.truncate(200), status: t.status, project_id: t.project_id, project_name: t.project.name }
      end
      spec_list = specs.map { |s| { id: s.id, title: s.title, summary: s.content&.truncate(400) } }

      <<~XML
        <north_star>#{@north_star}</north_star>
        <tickets>#{ticket_list.to_json}</tickets>
        <specs>#{spec_list.to_json}</specs>

        #{RESPONSE_FORMAT}
      XML
    end

    def yield_event(block, data)
      block.call(data.to_json) if block
    end

    def client
      @client ||= Anthropic::Client.new(api_key: ENV.fetch("ANTHROPIC_API_KEY", "placeholder"))
    end
  end
end
