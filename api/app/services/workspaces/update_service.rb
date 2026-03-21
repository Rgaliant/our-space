module Workspaces
  class UpdateService
    def initialize(workspace, params)
      @workspace = workspace
      @params    = params
    end

    def call
      if @workspace.update(@params)
        Result.new(success: true, payload: @workspace)
      else
        Result.new(success: false, error: @workspace.errors.full_messages.to_sentence)
      end
    end
  end
end
