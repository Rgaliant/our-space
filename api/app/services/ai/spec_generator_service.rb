module Ai
  class SpecGeneratorService
    def initialize(response_text, project:, user:)
      @response_text = response_text
      @project = project
      @user = user
    end

    def call
      xml_match = @response_text.match(/<generate_spec>(.*?)<\/generate_spec>/m)
      return Result.new(success: false, error: "No spec XML found") unless xml_match

      xml = xml_match[1]
      title = extract_tag(xml, "title")
      content = extract_tag(xml, "content")
      tickets_xml = extract_tag(xml, "tickets")

      spec = @project.specs.create!(
        workspace: @project.workspace,
        title: title,
        content: content,
        status: "draft",
        ai_generated: true,
        created_by_id: @user.id
      )

      parse_tickets(tickets_xml, spec)

      # Queue embedding
      EmbedRecordJob.perform_later("Spec", spec.id)

      Result.new(success: true, payload: spec)
    rescue ActiveRecord::RecordInvalid => e
      Result.new(success: false, error: e.message)
    end

    private

    def extract_tag(xml, tag)
      xml.match(/<#{tag}>(.*?)<\/#{tag}>/m)&.captures&.first.to_s.strip
    end

    def parse_tickets(tickets_xml, spec)
      return unless tickets_xml.present?

      tickets_xml.scan(/<ticket>(.*?)<\/ticket>/m).each_with_index do |match, index|
        ticket_xml = match.first
        title = extract_tag(ticket_xml, "title")
        priority = extract_tag(ticket_xml, "priority").presence || "medium"
        story_points = extract_tag(ticket_xml, "story_points").to_i.then { |sp| sp.positive? ? sp : nil }
        description = extract_tag(ticket_xml, "description")

        next if title.blank?

        ticket = spec.tickets.create!(
          workspace: spec.workspace,
          project: spec.project,
          title: title,
          description: description,
          priority: PRIORITIES.include?(priority) ? priority : "medium",
          status: "backlog",
          created_by_id: @user.id,
          story_points: story_points,
          position: index + 1
        )
        EmbedRecordJob.perform_later("Ticket", ticket.id)
      end
    end

    PRIORITIES = Ticket::PRIORITIES
  end
end
