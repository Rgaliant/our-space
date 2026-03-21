module Projects
  class UpdateService
    def initialize(project, params)
      @project = project
      @params  = params
    end

    def call
      if @project.update(@params)
        Result.new(success: true, payload: @project)
      else
        Result.new(success: false, error: @project.errors.full_messages.to_sentence)
      end
    end
  end
end
