module Api
  module V1
    class GithubRepositoriesController < ApplicationController
      before_action :set_workspace
      before_action :set_repository, only: [ :destroy, :sync ]

      # GET /api/v1/workspaces/:workspace_slug/github_repositories
      def index
        repos = @workspace.github_repositories.includes(:project).order(:full_name)
        render json: { data: GithubRepositorySerializer.render_as_hash(repos) }
      end

      # POST /api/v1/workspaces/:workspace_slug/github_repositories
      def create
        result = Github::ConnectRepositoryService.new(
          repo_params,
          workspace: @workspace,
          user: current_user
        ).call

        if result.success?
          render json: { data: GithubRepositorySerializer.render_as_hash(result.payload) },
                 status: :created
        else
          render json: { error: { message: result.error, code: "GITHUB_REPO_CONNECT_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/workspaces/:workspace_slug/github_repositories/:id
      def destroy
        Github::DisconnectRepositoryService.new(@repository).call
        head :no_content
      end

      # POST /api/v1/workspaces/:workspace_slug/github_repositories/:id/sync
      def sync
        Github::SyncRepositoryJob.perform_later(@repository.id)
        render json: { data: GithubRepositorySerializer.render_as_hash(@repository) }
      end

      private

      def set_workspace
        @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
      end

      def set_repository
        @repository = @workspace.github_repositories.find(params[:id])
      end

      def repo_params
        params.expect(github_repository: [
          :github_repo_id, :full_name, :name, :description,
          :private, :default_branch, :project_id
        ])
      end
    end
  end
end
