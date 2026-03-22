module Api
  module V1
    class CyclesController < ApplicationController
      before_action :set_workspace
      before_action :set_project
      before_action :set_cycle, only: [ :show, :update, :destroy ]

      def index
        cycles = @project.cycles.ordered
        render json: { data: CycleSerializer.render_as_hash(cycles) }
      end

      def show
        render json: { data: CycleSerializer.render_as_hash(@cycle) }
      end

      def create
        result = Cycles::CreateService.new(cycle_params, project: @project, workspace: @workspace, user: current_user).call
        if result.success?
          render json: { data: CycleSerializer.render_as_hash(result.payload) }, status: :created
        else
          render json: { error: { message: result.error, code: "CYCLE_CREATE_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      def update
        result = Cycles::UpdateService.new(@cycle, cycle_params).call
        if result.success?
          render json: { data: CycleSerializer.render_as_hash(result.payload) }
        else
          render json: { error: { message: result.error, code: "CYCLE_UPDATE_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      def destroy
        @cycle.destroy!
        head :no_content
      end

      private

      def set_workspace
        @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
      end

      def set_project
        @project = @workspace.projects.find(params[:project_id])
      end

      def set_cycle
        @cycle = @project.cycles.find(params[:id])
      end

      def cycle_params
        params.expect(cycle: [ :name, :start_date, :end_date, :status ])
      end
    end
  end
end
