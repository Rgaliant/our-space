module Api
  module V1
    class TicketLabelsController < ApplicationController
      before_action :set_workspace
      before_action :set_ticket

      def update
        result = Tickets::UpdateLabelsService.new(@ticket, label_ids: label_ids, workspace: @workspace).call
        if result.success?
          render json: { data: TicketSerializer.render_as_hash(result.payload) }
        else
          render json: { error: { message: result.error, code: "TICKET_LABELS_UPDATE_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      private

      def set_workspace
        @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
      end

      def set_ticket
        @project = @workspace.projects.find(params[:project_id])
        @ticket = @project.tickets.find(params[:ticket_id])
      end

      def label_ids
        params.expect(ticket_labels: { label_ids: [] })[:label_ids]
      end
    end
  end
end
