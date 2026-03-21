module Api
  module V1
    class FeedbackController < ApplicationController
      before_action :set_workspace
      before_action :set_feedback, only: [ :show, :update, :destroy ]

      def index
        feedback = @workspace.feedback.recent
        feedback = feedback.where(project_id: params[:project_id]) if params[:project_id].present?
        render json: { data: JSON.parse(FeedbackSerializer.render(feedback)) }
      end

      def show
        render json: { data: FeedbackSerializer.render_as_hash(@feedback) }
      end

      def create
        feedback = @workspace.feedback.build(feedback_params)
        if feedback.save
          render json: { data: FeedbackSerializer.render_as_hash(feedback) }, status: :created
        else
          render json: { error: { message: feedback.errors.full_messages.to_sentence,
                                   code: "FEEDBACK_CREATION_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      def update
        if @feedback.update(feedback_params)
          render json: { data: FeedbackSerializer.render_as_hash(@feedback) }
        else
          render json: { error: { message: @feedback.errors.full_messages.to_sentence,
                                   code: "FEEDBACK_UPDATE_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      def destroy
        @feedback.destroy!
        head :no_content
      end

      private

      def set_workspace
        @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
      end

      def set_feedback
        @feedback = @workspace.feedback.find(params[:id])
      end

      def feedback_params
        params.expect(feedback: [ :project_id, :source, :content, :sentiment, :customer_identifier ])
      end
    end
  end
end
