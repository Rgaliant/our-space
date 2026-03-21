module Api
  module V1
    class TicketsController < ApplicationController
      before_action :set_workspace
      before_action :set_project
      before_action :set_spec
      before_action :set_ticket, only: %i[show update destroy]

      def index
        tickets = @spec.tickets
        render json: { data: TicketSerializer.render_as_hash(tickets) }
      end

      def show
        render json: { data: TicketSerializer.render_as_hash(@ticket) }
      end

      def create
        result = Tickets::CreateService.new(ticket_params, spec: @spec, user: current_user).call

        if result.success?
          render json: { data: TicketSerializer.render_as_hash(result.payload) }, status: :created
        else
          render json: { error: { message: result.error, code: "ticket_create_failed" } }, status: :unprocessable_entity
        end
      end

      def update
        result = Tickets::UpdateService.new(@ticket, ticket_params).call

        if result.success?
          render json: { data: TicketSerializer.render_as_hash(result.payload) }
        else
          render json: { error: { message: result.error, code: "ticket_update_failed" } }, status: :unprocessable_entity
        end
      end

      def destroy
        result = Tickets::DestroyService.new(@ticket).call

        if result.success?
          head :no_content
        else
          render json: { error: { message: result.error, code: "ticket_destroy_failed" } }, status: :unprocessable_entity
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
        @spec = @project.specs.find(params[:spec_id])
      end

      def set_ticket
        @ticket = @spec.tickets.find(params[:id])
      end

      def ticket_params
        params.expect(ticket: [ :title, :description, :status, :priority, :story_points, :assignee_id, :position ])
      end
    end
  end
end
