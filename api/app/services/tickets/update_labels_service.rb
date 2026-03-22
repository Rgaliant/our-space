module Tickets
  class UpdateLabelsService
    def initialize(ticket, label_ids:, workspace:)
      @ticket    = ticket
      @label_ids = Array(label_ids).map(&:to_i)
      @workspace = workspace
    end

    def call
      labels = @workspace.labels.where(id: @label_ids)
      if labels.size != @label_ids.uniq.size
        return Result.new(success: false, error: "One or more labels not found in this workspace")
      end

      @ticket.labels = labels
      Result.new(success: true, payload: @ticket.reload)
    rescue ActiveRecord::RecordInvalid => e
      Result.new(success: false, error: e.message)
    end
  end
end
