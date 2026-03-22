class ApplicationController < ActionController::API
  include Clerk::Authenticatable
  before_action :require_clerk_session!

  rescue_from StandardError,                       with: :handle_server_error
  rescue_from ActionController::ParameterMissing, with: :handle_bad_request
  rescue_from ActiveRecord::RecordNotFound,        with: :handle_not_found
  rescue_from ActiveRecord::RecordInvalid,         with: :handle_unprocessable
  rescue_from Clerk::AuthenticationError,          with: :handle_unauthorized

  if Rails.env.test?
    def require_clerk_session!
      user_id = request.headers["X-Clerk-User-Id"]
      render json: { error: { message: "Authentication required", code: "UNAUTHORIZED" } },
             status: :unauthorized and return unless user_id.present?
      @_test_user_id = user_id
    end

    def clerk_session
      OpenStruct.new(user_id: @_test_user_id)
    end
  end

  private

  def current_user
    @current_user ||= User.find_by(id: clerk_session.user_id) || sync_user_from_clerk
  end

  def sync_user_from_clerk
    response = Faraday.get("https://api.clerk.com/v1/users/#{clerk_session.user_id}") do |req|
      req.headers["Authorization"] = "Bearer #{ENV.fetch("CLERK_SECRET_KEY", "")}"
    end
    raise ActiveRecord::RecordNotFound, "Clerk user not found" unless response.success?

    data = JSON.parse(response.body)
    User.create!(
      id: data["id"],
      email: data["email_addresses"]&.first&.dig("email_address") || "#{data["id"]}@placeholder.local",
      display_name: [ data["first_name"], data["last_name"] ].compact.join(" ").presence
    )
  rescue ActiveRecord::RecordNotFound
    raise
  rescue StandardError => e
    Rails.logger.warn("User sync failed for #{clerk_session.user_id}: #{e.message}")
    raise ActiveRecord::RecordNotFound, "User #{clerk_session.user_id} not found"
  end

  def handle_bad_request(e)
    render json: { error: { message: e.message, code: "BAD_REQUEST" } },
           status: :bad_request
  end

  def handle_not_found(_e)
    render json: { error: { message: "Resource not found", code: "NOT_FOUND" } },
           status: :not_found
  end

  def handle_unprocessable(e)
    render json: { error: { message: e.message, code: "VALIDATION_FAILED" } },
           status: :unprocessable_entity
  end

  def handle_unauthorized(_e)
    render json: { error: { message: "Authentication required", code: "UNAUTHORIZED" } },
           status: :unauthorized
  end

  def handle_server_error(e)
    Rails.logger.error("Unhandled #{e.class}: #{e.message}\n#{e.backtrace&.first(10)&.join("\n")}")
    render json: { error: { message: "Internal server error", code: "INTERNAL_ERROR" } },
           status: :internal_server_error
  end
end
