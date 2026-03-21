require "rails_helper"

RSpec.describe "Api::V1::Workspaces", type: :request do
  fixtures :all

  before(:each) do
    @workspace = workspaces(:acme)
    @user      = users(:john)
    @headers   = clerk_auth_headers(@user.id)
  end

  describe "GET /api/v1/workspaces" do
    context "when authenticated" do
      it "returns workspaces for current user" do
        get "/api/v1/workspaces", headers: @headers

        expect(response).to have_http_status(:ok)
        expect(json_body["data"]).to be_an(Array)
        expect(json_body["data"].map { |w| w["slug"] }).to include(@workspace.slug)
      end
    end

    context "when unauthenticated" do
      it "returns 401" do
        get "/api/v1/workspaces"
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "GET /api/v1/workspaces/:slug" do
    context "when authenticated" do
      it "returns the workspace" do
        get "/api/v1/workspaces/#{@workspace.slug}", headers: @headers

        expect(response).to have_http_status(:ok)
        expect(json_body.dig("data", "slug")).to eq(@workspace.slug)
      end
    end

    context "when user is not a member" do
      it "returns 404" do
        outsider = users(:outsider)
        get "/api/v1/workspaces/#{@workspace.slug}", headers: clerk_auth_headers(outsider.id)

        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe "POST /api/v1/workspaces" do
    context "when authenticated" do
      it "creates a workspace and returns 201" do
        expect {
          post "/api/v1/workspaces",
               params: { workspace: { name: "New Startup", plan: "free" } },
               headers: @headers
        }.to change(Workspace, :count).by(1)

        expect(response).to have_http_status(:created)
        expect(json_body.dig("data", "name")).to eq("New Startup")
      end

      it "returns 422 when name is blank" do
        post "/api/v1/workspaces",
             params: { workspace: { name: "" } },
             headers: @headers

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json_body.dig("error", "code")).to eq("WORKSPACE_CREATION_FAILED")
      end
    end
  end

  describe "PATCH /api/v1/workspaces/:slug" do
    context "when authenticated" do
      it "updates the workspace" do
        patch "/api/v1/workspaces/#{@workspace.slug}",
              params: { workspace: { name: "Acme Updated" } },
              headers: @headers

        expect(response).to have_http_status(:ok)
        expect(json_body.dig("data", "name")).to eq("Acme Updated")
      end
    end
  end

  describe "DELETE /api/v1/workspaces/:slug" do
    context "when authenticated" do
      it "destroys the workspace and returns 204" do
        expect {
          delete "/api/v1/workspaces/#{@workspace.slug}", headers: @headers
        }.to change(Workspace, :count).by(-1)

        expect(response).to have_http_status(:no_content)
      end
    end
  end
end
