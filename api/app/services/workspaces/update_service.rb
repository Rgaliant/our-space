module Workspaces
  class UpdateService
    def initialize(workspace, params)
      @workspace = workspace
      @params    = params
    end

    def call
      merged = @params.to_h.symbolize_keys
      if merged[:context].present?
        merged[:context] = @workspace.context.merge(merged[:context].stringify_keys)
      end

      if @workspace.update(merged)
        Result.new(success: true, payload: @workspace)
      else
        Result.new(success: false, error: @workspace.errors.full_messages.to_sentence)
      end
    end
  end
end
