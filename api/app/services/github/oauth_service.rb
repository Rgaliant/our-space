module Github
  class OauthService
    def initialize(code, user_id:)
      @code    = code
      @user_id = user_id
    end

    def call
      token_response = Github::ApiClient.exchange_code(@code)
      unless token_response.success?
        return Result.new(success: false, error: "GitHub token exchange failed")
      end

      token_data = token_response.body
      if token_data["error"].present?
        return Result.new(success: false, error: token_data["error_description"] || token_data["error"])
      end

      access_token = token_data["access_token"]
      scopes       = token_data["scope"]

      api           = Github::ApiClient.new(access_token)
      user_response = api.get_user
      unless user_response.success?
        return Result.new(success: false, error: "Failed to fetch GitHub user profile")
      end

      github_user = user_response.body

      connection = GithubConnection.find_or_initialize_by(user_id: @user_id)
      connection.assign_attributes(
        access_token:   access_token,
        scopes:         scopes,
        github_login:   github_user["login"],
        github_user_id: github_user["id"].to_s
      )

      if connection.save
        Result.new(success: true, payload: connection)
      else
        Result.new(success: false, error: connection.errors.full_messages.to_sentence)
      end
    end
  end
end
