module Api
  module V1
    class TicketCommentsController < ApplicationController
      before_action :set_workspace
      before_action :set_project
      before_action :set_ticket
      before_action :set_comment, only: [ :destroy ]

      def index
        comments = @ticket.comments.chronological.includes(:author)
        render json: { data: TicketCommentSerializer.render_as_hash(comments) }
      end

      def create
        result = TicketComments::CreateService.new(
          comment_params, ticket: @ticket, workspace: @workspace, user: current_user
        ).call

        if result.success?
          render json: { data: TicketCommentSerializer.render_as_hash(result.payload) }, status: :created
        else
          render json: { error: { message: result.error, code: "COMMENT_CREATE_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      def destroy
        result = TicketComments::DestroyService.new(@comment, user: current_user).call

        if result.success?
          head :no_content
        else
          render json: { error: { message: result.error, code: "COMMENT_DELETE_FAILED" } },
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

      def set_ticket
        @ticket = @project.tickets.find(params[:ticket_id])
      end

      def set_comment
        @comment = @ticket.comments.find(params[:id])
      end

      def comment_params
        params.expect(ticket_comment: [ :body ])
      end
    end
  end
end
