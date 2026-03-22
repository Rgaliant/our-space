module Cycles
  class CreateService
    def initialize(params, project:, workspace:, user:)
      @params    = params
      @project   = project
      @workspace = workspace
      @user      = user
    end

    def call
      cycle = @project.cycles.build(
        @params.merge(workspace: @workspace, created_by: @user)
      )
      if cycle.save
        Result.new(success: true, payload: cycle)
      else
        Result.new(success: false, error: cycle.errors.full_messages.to_sentence)
      end
    end
  end
end
