module Github
  class ConnectRepositoryService
    def initialize(params, workspace:, user:)
      @params    = params
      @workspace = workspace
      @user      = user
    end

    def call
      unless @user.github_connection
        return Result.new(success: false, error: "GitHub account not connected")
      end

      repo = @workspace.github_repositories.build(
        connected_by:   @user,
        github_repo_id: @params[:github_repo_id],
        full_name:      @params[:full_name],
        name:           @params[:name],
        description:    @params[:description],
        private:        @params[:private] || false,
        default_branch: @params[:default_branch] || "main",
        project_id:     @params[:project_id]
      )

      if repo.save
        Github::SyncRepositoryJob.perform_later(repo.id)
        Result.new(success: true, payload: repo)
      else
        Result.new(success: false, error: repo.errors.full_messages.to_sentence)
      end
    end
  end
end
