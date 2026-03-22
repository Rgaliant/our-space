module Api
  module V1
    class SearchController < ApplicationController
      before_action :set_workspace

      def show
        query = params[:q].to_s.strip
        return render json: { data: { tickets: [], specs: [] } } if query.blank?

        tickets = @workspace.tickets
          .joins(:project)
          .where("tickets.title ILIKE :q OR tickets.description ILIKE :q", q: "%#{query}%")
          .select("tickets.id, tickets.title, tickets.status, tickets.priority, tickets.project_id, projects.name AS project_name")
          .limit(10)

        specs = @workspace.specs
          .where("title ILIKE :q OR content ILIKE :q", q: "%#{query}%")
          .select(:id, :title, :status, :project_id)
          .limit(5)

        render json: {
          data: {
            tickets: tickets.map { |t|
              { id: t.id, title: t.title, status: t.status, priority: t.priority,
                project_id: t.project_id, project_name: t.project_name }
            },
            specs: specs.map { |s|
              { id: s.id, title: s.title, status: s.status, project_id: s.project_id }
            }
          }
        }
      end

      private

      def set_workspace
        @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
      end
    end
  end
end
