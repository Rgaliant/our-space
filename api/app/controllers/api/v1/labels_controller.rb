module Api
  module V1
    class LabelsController < ApplicationController
      before_action :set_workspace
      before_action :set_label, only: [ :show, :update, :destroy ]

      def index
        labels = @workspace.labels.alphabetical
        render json: { data: LabelSerializer.render_as_hash(labels) }
      end

      def show
        render json: { data: LabelSerializer.render_as_hash(@label) }
      end

      def create
        result = Labels::CreateService.new(label_params, workspace: @workspace).call
        if result.success?
          render json: { data: LabelSerializer.render_as_hash(result.payload) }, status: :created
        else
          render json: { error: { message: result.error, code: "LABEL_CREATE_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      def update
        result = Labels::UpdateService.new(@label, label_params).call
        if result.success?
          render json: { data: LabelSerializer.render_as_hash(result.payload) }
        else
          render json: { error: { message: result.error, code: "LABEL_UPDATE_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      def destroy
        @label.destroy!
        head :no_content
      end

      private

      def set_workspace
        @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
      end

      def set_label
        @label = @workspace.labels.find(params[:id])
      end

      def label_params
        params.expect(label: [ :name, :color ])
      end
    end
  end
end
