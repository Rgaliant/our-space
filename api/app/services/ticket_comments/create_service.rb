module TicketComments
  class CreateService
    def initialize(params, ticket:, workspace:, user:)
      @params    = params
      @ticket    = ticket
      @workspace = workspace
      @user      = user
    end

    def call
      comment = @ticket.comments.build(
        @params.merge(workspace: @workspace, author: @user)
      )
      if comment.save
        Result.new(success: true, payload: comment)
      else
        Result.new(success: false, error: comment.errors.full_messages.to_sentence)
      end
    end
  end
end
