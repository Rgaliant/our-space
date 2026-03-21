module Projects
  class CreateService
    def initialize(params, workspace:)
      @params    = params
      @workspace = workspace
    end

    def call
      project = @workspace.projects.build(@params)

      return Result.new(success: false, error: project.errors.full_messages.to_sentence) unless project.save

      Result.new(success: true, payload: project)
    end
  end
end
