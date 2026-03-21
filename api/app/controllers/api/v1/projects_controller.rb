module Api
  module V1
    class ProjectsController < ApplicationController
      before_action :set_workspace
      before_action :set_project, only: [ :show, :update, :destroy ]

      def index
        projects = @workspace.projects.order(created_at: :desc)
        render json: { data: JSON.parse(ProjectSerializer.render(projects)) }
      end

      def show
        render json: { data: ProjectSerializer.render_as_hash(@project) }
      end

      def create
        result = Projects::CreateService.new(project_params, workspace: @workspace).call
        if result.success?
          render json: { data: ProjectSerializer.render_as_hash(result.payload) }, status: :created
        else
          render json: { error: { message: result.error, code: "PROJECT_CREATION_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      def update
        result = Projects::UpdateService.new(@project, project_params).call
        if result.success?
          render json: { data: ProjectSerializer.render_as_hash(result.payload) }
        else
          render json: { error: { message: result.error, code: "PROJECT_UPDATE_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      def destroy
        Projects::DestroyService.new(@project).call
        head :no_content
      end

      private

      def project_params
        params.expect(project: [ :name, :description, :status ])
      end

      def set_workspace
        @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
      end

      def set_project
        @project = @workspace.projects.find(params[:id])
      end
    end
  end
end
