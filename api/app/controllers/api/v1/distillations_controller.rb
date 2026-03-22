module Api
  module V1
    class DistillationsController < ApplicationController
      before_action :set_workspace
      before_action :set_distillation, only: [ :show ]

      def index
        distillations = @workspace.distillations.complete.recent.limit(10)
        render json: { data: DistillationSerializer.render_as_hash(distillations) }
      end

      def show
        render json: { data: DistillationSerializer.render_as_hash(@distillation) }
      end

      private

      def set_workspace
        @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
      end

      def set_distillation
        @distillation = @workspace.distillations.find(params[:id])
      end
    end
  end
end
