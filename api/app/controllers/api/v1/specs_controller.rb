module Api
  module V1
    class SpecsController < ApplicationController
      before_action :set_workspace
      before_action :set_project
      before_action :set_spec, only: [ :show, :update, :destroy ]

      def index
        specs = @project.specs
        render json: { data: SpecSerializer.render_as_hash(specs) }
      end

      def show
        render json: { data: SpecSerializer.render_as_hash(@spec) }
      end

      def create
        result = Specs::CreateService.new(spec_params, project: @project, user: current_user).call

        if result.success?
          render json: { data: SpecSerializer.render_as_hash(result.payload) }, status: :created
        else
          render json: { error: { message: result.error, code: "unprocessable_entity" } }, status: :unprocessable_entity
        end
      end

      def update
        result = Specs::UpdateService.new(@spec, spec_params).call

        if result.success?
          render json: { data: SpecSerializer.render_as_hash(result.payload) }
        else
          render json: { error: { message: result.error, code: "unprocessable_entity" } }, status: :unprocessable_entity
        end
      end

      def destroy
        result = Specs::DestroyService.new(@spec).call

        if result.success?
          head :no_content
        else
          render json: { error: { message: result.error, code: "unprocessable_entity" } }, status: :unprocessable_entity
        end
      end

      private

      def set_workspace
        @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
      end

      def set_project
        @project = @workspace.projects.find(params[:project_id])
      end

      def set_spec
        @spec = @project.specs.find(params[:id])
      end

      def spec_params
        params.expect(spec: [ :title, :content, :status, :ai_generated, :conversation_id ])
      end
    end
  end
end
