require "rails_helper"

RSpec.describe "Api::V1::Tickets", type: :request do
  fixtures :all

  before(:each) do
    @workspace = workspaces(:acme)
    @project = projects(:mobile_app)
    @spec = specs(:user_auth)
    @ticket = tickets(:login_bug)
    @user = users(:john)
    @headers = clerk_auth_headers(@user.id)
  end

  describe "GET /api/v1/workspaces/:workspace_slug/projects/:project_id/specs/:spec_id/tickets" do
    context "when authenticated" do
      it "returns list of tickets with http 200" do
        get "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs/#{@spec.id}/tickets",
            headers: @headers

        expect(response).to have_http_status(:ok)
        expect(json_body["data"]).to be_an(Array)
      end
    end

    context "when unauthenticated" do
      it "returns 401" do
        get "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs/#{@spec.id}/tickets"

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "GET /api/v1/workspaces/:workspace_slug/projects/:project_id/specs/:spec_id/tickets/:id" do
    context "when authenticated" do
      it "returns the ticket" do
        get "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs/#{@spec.id}/tickets/#{@ticket.id}",
            headers: @headers

        expect(response).to have_http_status(:ok)
        expect(json_body.dig("data", "id")).to eq(@ticket.id)
      end
    end
  end

  describe "POST /api/v1/workspaces/:workspace_slug/projects/:project_id/specs/:spec_id/tickets" do
    context "when authenticated" do
      it "creates a ticket and returns 201" do
        expect {
          post "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs/#{@spec.id}/tickets",
               params: { ticket: { title: "New Ticket", status: "backlog", priority: "medium" } },
               headers: @headers
        }.to change(Ticket, :count).by(1)

        expect(response).to have_http_status(:created)
      end

      it "returns 422 when title is blank" do
        post "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs/#{@spec.id}/tickets",
             params: { ticket: { title: "", status: "backlog", priority: "medium" } },
             headers: @headers

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end

  describe "PATCH /api/v1/workspaces/:workspace_slug/projects/:project_id/specs/:spec_id/tickets/:id" do
    context "when authenticated" do
      it "updates the ticket" do
        patch "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs/#{@spec.id}/tickets/#{@ticket.id}",
              params: { ticket: { title: "Updated Title" } },
              headers: @headers

        expect(response).to have_http_status(:ok)
        expect(json_body.dig("data", "title")).to eq("Updated Title")
      end
    end
  end

  describe "DELETE /api/v1/workspaces/:workspace_slug/projects/:project_id/specs/:spec_id/tickets/:id" do
    context "when authenticated" do
      it "destroys the ticket and returns 204" do
        delete "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs/#{@spec.id}/tickets/#{@ticket.id}",
               headers: @headers

        expect(response).to have_http_status(:no_content)
      end
    end
  end
end
