module PullRequests
  class UpdateService
    def initialize(pull_request, params)
      @pull_request = pull_request
      @params       = params
    end

    def call
      if @pull_request.update(@params)
        Result.new(success: true, payload: @pull_request)
      else
        Result.new(success: false, error: @pull_request.errors.full_messages.to_sentence)
      end
    end
  end
end
