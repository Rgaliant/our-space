module Api
  module V1
    module Ai
      class DistillationsController < ApplicationController
        include ActionController::Live

        before_action :set_workspace

        def create
          response.headers["Content-Type"] = "text/event-stream"
          response.headers["Cache-Control"] = "no-cache"
          response.headers["X-Accel-Buffering"] = "no"

          north_star = params.dig(:distillation, :north_star).to_s.strip

          if north_star.blank?
            response.stream.write("data: #{({ error: "North star cannot be blank" }).to_json}\n\n")
            return
          end

          result = ::Ai::DistillationService.new(
            north_star,
            workspace: @workspace,
            user: current_user
          ).call do |event_json|
            response.stream.write("data: #{event_json}\n\n")
          end

          unless result.success?
            response.stream.write("data: #{({ error: result.error }).to_json}\n\n")
          end

          response.stream.write("data: [DONE]\n\n")
        rescue ActionController::Live::ClientDisconnected
          # Client disconnected — normal, ignore
        ensure
          response.stream.close
        end

        private

        def set_workspace
          @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
        end
      end
    end
  end
end
