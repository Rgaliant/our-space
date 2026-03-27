module Api
  module V1
    module Github
      class ConnectionsController < ApplicationController
        before_action :set_connection, only: [ :show, :destroy ]

        # GET /api/v1/github/connection
        def show
          render json: { data: GithubConnectionSerializer.render_as_hash(@connection) }
        end

        # DELETE /api/v1/github/connection
        def destroy
          @connection.destroy!
          head :no_content
        end

        private

        def set_connection
          @connection = current_user.github_connection ||
            raise(ActiveRecord::RecordNotFound, "GitHub connection not found")
        end
      end
    end
  end
end
