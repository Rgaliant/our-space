module Specs
  class UpdateService
    def initialize(spec, params)
      @spec = spec
      @params = params
    end

    def call
      if @spec.update(@params)
        Result.new(success: true, payload: @spec)
      else
        Result.new(success: false, error: @spec.errors.full_messages.to_sentence)
      end
    rescue ActiveRecord::RecordInvalid => e
      Result.new(success: false, error: e.message)
    end
  end
end
