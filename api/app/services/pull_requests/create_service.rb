module PullRequests
  class CreateService
    def initialize(params, ticket:, workspace:)
      @params    = params
      @ticket    = ticket
      @workspace = workspace
    end

    def call
      pr = @ticket.pull_requests.build(@params.merge(workspace: @workspace))
      if pr.save
        Result.new(success: true, payload: pr)
      else
        Result.new(success: false, error: pr.errors.full_messages.to_sentence)
      end
    end
  end
end
