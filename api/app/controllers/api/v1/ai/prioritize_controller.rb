module Api
  module V1
    module Ai
      class PrioritizeController < ApplicationController
        before_action :set_workspace
        before_action :set_project

        def create
          result = Ai::PrioritizationService.new(@project, user: current_user).call
          if result.success?
            render json: { data: { scores: result.payload } }
          else
            render json: { error: { message: result.error, code: "PRIORITIZATION_FAILED" } },
                   status: :unprocessable_entity
          end
        end

        private

        def set_workspace
          @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
        end

        def set_project
          @project = @workspace.projects.find(params[:project_id])
        end
      end
    end
  end
end
