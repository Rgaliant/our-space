module Workspaces
  class CreateService
    def initialize(params, user:)
      @params = params
      @user   = user
    end

    def call
      workspace = Workspace.new(@params)
      workspace.owner = @user

      return Result.new(success: false, error: workspace.errors.full_messages.to_sentence) unless workspace.save

      WorkspaceMember.create!(workspace: workspace, user: @user, role: "owner")
      Result.new(success: true, payload: workspace)
    rescue ActiveRecord::RecordInvalid => e
      Result.new(success: false, error: e.message)
    end
  end
end
