module Specs
  class CreateService
    def initialize(params, project:, user:)
      @params = params
      @project = project
      @user = user
    end

    def call
      spec = @project.specs.build(
        @params.merge(workspace: @project.workspace, created_by_id: @user.id)
      )
      if spec.save
        Result.new(success: true, payload: spec)
      else
        Result.new(success: false, error: spec.errors.full_messages.to_sentence)
      end
    end
  end
end
