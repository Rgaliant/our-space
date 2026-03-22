module Labels
  class UpdateService
    def initialize(label, params)
      @label  = label
      @params = params
    end

    def call
      if @label.update(@params)
        Result.new(success: true, payload: @label)
      else
        Result.new(success: false, error: @label.errors.full_messages.to_sentence)
      end
    end
  end
end
