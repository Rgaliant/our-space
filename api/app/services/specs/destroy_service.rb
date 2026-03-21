module Specs
  class DestroyService
    def initialize(spec)
      @spec = spec
    end

    def call
      @spec.destroy!
      Result.new(success: true, payload: @spec)
    rescue ActiveRecord::RecordNotDestroyed => e
      Result.new(success: false, error: e.message)
    end
  end
end
