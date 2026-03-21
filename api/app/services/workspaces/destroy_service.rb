module Workspaces
  class DestroyService
    def initialize(workspace)
      @workspace = workspace
    end

    def call
      @workspace.destroy!
      Result.new(success: true, payload: nil)
    rescue ActiveRecord::RecordNotDestroyed => e
      Result.new(success: false, error: e.message)
    end
  end
end
