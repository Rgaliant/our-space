module Projects
  class DestroyService
    def initialize(project)
      @project = project
    end

    def call
      @project.destroy!
      Result.new(success: true, payload: nil)
    rescue ActiveRecord::RecordNotDestroyed => e
      Result.new(success: false, error: e.message)
    end
  end
end
