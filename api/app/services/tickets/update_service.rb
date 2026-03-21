module Tickets
  class UpdateService
    def initialize(ticket, params)
      @ticket = ticket
      @params = params
    end

    def call
      if @ticket.update(@params)
        Result.new(success: true, payload: @ticket)
      else
        Result.new(success: false, error: @ticket.errors.full_messages.join(", "))
      end
    end
  end
end
