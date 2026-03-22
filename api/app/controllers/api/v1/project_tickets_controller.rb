module Api
  module V1
    class ProjectTicketsController < ApplicationController
      before_action :set_workspace
      before_action :set_project
      before_action :set_ticket, only: [ :update ]

      def index
        tickets = @project.tickets.order(:position, :created_at)
        render json: { data: TicketSerializer.render_as_hash(tickets) }
      end

      def update
        result = Tickets::UpdateService.new(@ticket, ticket_params).call
        if result.success?
          render json: { data: TicketSerializer.render_as_hash(result.payload) }
        else
          render json: { error: { message: result.error, code: "TICKET_UPDATE_FAILED" } },
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
        @ticket = @project.tickets.find(params[:id])
      end

      def ticket_params
        params.expect(ticket: [ :title, :description, :status, :priority, :story_points, :assignee_id, :position ])
      end
    end
  end
end
