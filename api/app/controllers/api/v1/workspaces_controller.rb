module Api
  module V1
    class WorkspacesController < ApplicationController
      before_action :set_workspace, only: [ :show, :update, :destroy ]

      def index
        workspaces = current_user.workspaces.includes(:owner)
        render json: { data: JSON.parse(WorkspaceSerializer.render(workspaces)) }
      end

      def show
        render json: { data: WorkspaceSerializer.render_as_hash(@workspace, view: :with_members) }
      end

      def create
        result = Workspaces::CreateService.new(workspace_params, user: current_user).call
        if result.success?
          render json: { data: WorkspaceSerializer.render_as_hash(result.payload) }, status: :created
        else
          render json: { error: { message: result.error, code: "WORKSPACE_CREATION_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      def update
        result = Workspaces::UpdateService.new(@workspace, workspace_params).call
        if result.success?
          render json: { data: WorkspaceSerializer.render_as_hash(result.payload) }
        else
          render json: { error: { message: result.error, code: "WORKSPACE_UPDATE_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      def destroy
        Workspaces::DestroyService.new(@workspace).call
        head :no_content
      end

      private

      def workspace_params
        params.expect(workspace: [ :name, :plan ])
      end

      def set_workspace
        @workspace = current_user.workspaces.find_by!(slug: params[:slug])
      end
    end
  end
end
