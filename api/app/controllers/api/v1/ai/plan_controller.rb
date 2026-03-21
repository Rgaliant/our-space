module Api
  module V1
    module Ai
      class PlanController < ApplicationController
        include ActionController::Live

        before_action :set_workspace
        before_action :set_conversation

        def create
          response.headers["Content-Type"] = "text/event-stream"
          response.headers["Cache-Control"] = "no-cache"
          response.headers["X-Accel-Buffering"] = "no"

          message = params.expect(plan: :message)
          project = @workspace.projects.find(params[:project_id]) if params[:project_id].present?

          result = Ai::PlanningModeService.new(
            message,
            conversation: @conversation,
            workspace: @workspace,
            project: project,
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

        def set_conversation
          @conversation = @workspace.conversations.find(params[:conversation_id])
        end
      end
    end
  end
end
