module Api
  module V1
    module Ai
      class TicketController < ApplicationController
        include ActionController::Live

        before_action :set_workspace
        before_action :set_project
        before_action :set_ticket

        def create
          response.headers["Content-Type"] = "text/event-stream"
          response.headers["Cache-Control"] = "no-cache"
          response.headers["X-Accel-Buffering"] = "no"

          message = params.expect(ticket_assistant: :message)

          result = Ai::TicketAssistantService.new(
            message,
            ticket: @ticket,
            workspace: @workspace,
            user: current_user
          ).call do |chunk|
            response.stream.write("data: #{chunk.to_json}\n\n")
          end

          if result.success?
            response.stream.write("data: [DONE]\n\n")
          else
            response.stream.write("data: #{({ error: result.error }).to_json}\n\n")
          end
        rescue ActionController::Live::ClientDisconnected
          # Client disconnected — normal, ignore
        ensure
          response.stream.close
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
      end
    end
  end
end
