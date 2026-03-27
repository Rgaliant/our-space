module Api
  module V1
    module Github
      class OauthController < ApplicationController
        skip_before_action :require_clerk_session!, only: [ :callback ]

        # GET /api/v1/github/authorize?workspace_slug=acme
        def authorize
          state = verifier.generate(
            { "user_id" => current_user.id, "workspace_slug" => params[:workspace_slug] },
            expires_in: 10.minutes
          )

          url = "https://github.com/login/oauth/authorize?" + {
            client_id:    ENV.fetch("GITHUB_CLIENT_ID", ""),
            scope:        "repo read:user user:email",
            state:        state,
            redirect_uri: "#{ENV.fetch("API_BASE_URL", "http://localhost:3001")}/api/v1/github/callback"
          }.to_query

          render json: { data: { url: url } }
        end

        # GET /api/v1/github/callback?code=...&state=...
        def callback
          state_data = verifier.verified(params[:state])

          if state_data.nil?
            return redirect_to "#{ENV.fetch("FRONTEND_URL", "http://localhost:3000")}/github?error=invalid_state",
                               allow_other_host: true
          end

          user_id        = state_data["user_id"]
          workspace_slug = state_data["workspace_slug"]

          result = Github::OauthService.new(params[:code], user_id: user_id).call

          if result.success?
            redirect_to "#{ENV.fetch("FRONTEND_URL", "http://localhost:3000")}/workspace/#{workspace_slug}/github?connected=true",
                        allow_other_host: true
          else
            redirect_to "#{ENV.fetch("FRONTEND_URL", "http://localhost:3000")}/workspace/#{workspace_slug}/github?error=oauth_failed",
                        allow_other_host: true
          end
        end

        private

        def verifier
          @verifier ||= ActiveSupport::MessageVerifier.new(
            Rails.application.secret_key_base,
            serializer: JSON,
            digest: "SHA256"
          )
        end
      end
    end
  end
end
