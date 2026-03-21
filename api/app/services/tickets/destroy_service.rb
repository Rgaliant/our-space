module Tickets
  class DestroyService
    def initialize(ticket)
      @ticket = ticket
    end

    def call
      @ticket.destroy!
      Result.new(success: true, payload: @ticket)
    rescue ActiveRecord::RecordNotDestroyed => e
      Result.new(success: false, error: e.message)
    end
  end
end
