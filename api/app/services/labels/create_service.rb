module Labels
  class CreateService
    def initialize(params, workspace:)
      @params    = params
      @workspace = workspace
    end

    def call
      label = @workspace.labels.build(@params)
      if label.save
        Result.new(success: true, payload: label)
      else
        Result.new(success: false, error: label.errors.full_messages.to_sentence)
      end
    end
  end
end
