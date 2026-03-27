module Api
  module V1
    module Github
      class ReposController < ApplicationController
        before_action :set_workspace
        before_action :set_connection

        # GET /api/v1/workspaces/:workspace_slug/github/repos
        def index
          result = Github::ListUserReposService.new(@connection).call
          if result.success?
            render json: { data: result.payload }
          else
            render json: { error: { message: result.error, code: "GITHUB_REPOS_FETCH_FAILED" } },
                   status: :unprocessable_entity
          end
        end

        private

        def set_workspace
          @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
        end

        def set_connection
          @connection = current_user.github_connection ||
            raise(ActiveRecord::RecordNotFound, "GitHub connection not found")
        end
      end
    end
  end
end
