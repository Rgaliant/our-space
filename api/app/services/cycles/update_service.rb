module Cycles
  class UpdateService
    def initialize(cycle, params)
      @cycle  = cycle
      @params = params
    end

    def call
      if @cycle.update(@params)
        Result.new(success: true, payload: @cycle)
      else
        Result.new(success: false, error: @cycle.errors.full_messages.to_sentence)
      end
    end
  end
end
