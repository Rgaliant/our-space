require "rails_helper"

RSpec.describe "Api::V1::Projects", type: :request do
  fixtures :all

  before(:each) do
    @workspace = workspaces(:acme)
    @project   = projects(:mobile_app)
    @user      = users(:john)
    @headers   = clerk_auth_headers(@user.id)
  end

  describe "GET /api/v1/workspaces/:workspace_slug/projects" do
    context "when authenticated" do
      it "returns all projects for the workspace" do
        get "/api/v1/workspaces/#{@workspace.slug}/projects", headers: @headers

        expect(response).to have_http_status(:ok)
        expect(json_body["data"]).to be_an(Array)
        expect(json_body["data"].map { |p| p["name"] }).to include(@project.name)
      end
    end

    context "when unauthenticated" do
      it "returns 401" do
        get "/api/v1/workspaces/#{@workspace.slug}/projects"
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "GET /api/v1/workspaces/:workspace_slug/projects/:id" do
    context "when authenticated" do
      it "returns the project" do
        get "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}", headers: @headers

        expect(response).to have_http_status(:ok)
        expect(json_body.dig("data", "name")).to eq(@project.name)
      end
    end
  end

  describe "POST /api/v1/workspaces/:workspace_slug/projects" do
    context "when authenticated" do
      it "creates a project and returns 201" do
        expect {
          post "/api/v1/workspaces/#{@workspace.slug}/projects",
               params: { project: { name: "New Feature", description: "A new project", status: "active" } },
               headers: @headers
        }.to change(Project, :count).by(1)

        expect(response).to have_http_status(:created)
        expect(json_body.dig("data", "name")).to eq("New Feature")
      end

      it "returns 422 when name is blank" do
        post "/api/v1/workspaces/#{@workspace.slug}/projects",
             params: { project: { name: "" } },
             headers: @headers

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json_body.dig("error", "code")).to eq("PROJECT_CREATION_FAILED")
      end
    end
  end

  describe "PATCH /api/v1/workspaces/:workspace_slug/projects/:id" do
    context "when authenticated" do
      it "updates the project" do
        patch "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}",
              params: { project: { name: "Mobile App v2" } },
              headers: @headers

        expect(response).to have_http_status(:ok)
        expect(json_body.dig("data", "name")).to eq("Mobile App v2")
      end
    end
  end

  describe "DELETE /api/v1/workspaces/:workspace_slug/projects/:id" do
    context "when authenticated" do
      it "destroys the project and returns 204" do
        expect {
          delete "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}",
                 headers: @headers
        }.to change(Project, :count).by(-1)

        expect(response).to have_http_status(:no_content)
      end
    end
  end
end
