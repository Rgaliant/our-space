module Api
  module V1
    class PullRequestsController < ApplicationController
      before_action :set_workspace
      before_action :set_ticket
      before_action :set_pull_request, only: [ :update, :destroy ]

      def index
        prs = @ticket.pull_requests.order(:created_at)
        render json: { data: PullRequestSerializer.render_as_hash(prs) }
      end

      def create
        result = PullRequests::CreateService.new(pr_params, ticket: @ticket, workspace: @workspace).call
        if result.success?
          render json: { data: PullRequestSerializer.render_as_hash(result.payload) }, status: :created
        else
          render json: { error: { message: result.error, code: "PULL_REQUEST_CREATE_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      def update
        result = PullRequests::UpdateService.new(@pull_request, pr_params).call
        if result.success?
          render json: { data: PullRequestSerializer.render_as_hash(result.payload) }
        else
          render json: { error: { message: result.error, code: "PULL_REQUEST_UPDATE_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      def destroy
        @pull_request.destroy!
        head :no_content
      end

      private

      def set_workspace
        @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
      end

      def set_ticket
        @project = @workspace.projects.find(params[:project_id])
        @ticket = @project.tickets.find(params[:ticket_id])
      end

      def set_pull_request
        @pull_request = @ticket.pull_requests.find(params[:id])
      end

      def pr_params
        params.expect(pull_request: [ :url, :title, :status ])
      end
    end
  end
end
