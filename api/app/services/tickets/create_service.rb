module Tickets
  class CreateService
    def initialize(params, spec:, user:)
      @params = params
      @spec = spec
      @user = user
    end

    def call
      ticket = @spec.tickets.build(
        @params.merge(
          workspace: @spec.workspace,
          project: @spec.project,
          created_by_id: @user.id
        )
      )

      if ticket.save
        Result.new(success: true, payload: ticket)
      else
        Result.new(success: false, error: ticket.errors.full_messages.join(", "))
      end
    end
  end
end
