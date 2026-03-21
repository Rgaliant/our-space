require "rails_helper"

RSpec.describe "Api::V1::Specs", type: :request do
  fixtures :all

  before(:each) do
    @workspace = workspaces(:acme)
    @project = projects(:mobile_app)
    @spec = specs(:user_auth)
    @user = users(:john)
    @headers = clerk_auth_headers(@user.id)
  end

  describe "GET /api/v1/workspaces/:workspace_slug/projects/:project_id/specs" do
    context "when authenticated" do
      it "returns list of specs with http 200" do
        get "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs",
            headers: @headers

        expect(response).to have_http_status(:ok)
        expect(json_body["data"]).to be_an(Array)
      end
    end

    context "when unauthenticated" do
      it "returns 401" do
        get "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs"

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "GET /api/v1/workspaces/:workspace_slug/projects/:project_id/specs/:id" do
    context "when authenticated" do
      it "returns the spec" do
        get "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs/#{@spec.id}",
            headers: @headers

        expect(response).to have_http_status(:ok)
        expect(json_body.dig("data", "id")).to eq(@spec.id)
      end
    end
  end

  describe "POST /api/v1/workspaces/:workspace_slug/projects/:project_id/specs" do
    context "when authenticated" do
      it "creates a spec and returns 201" do
        expect {
          post "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs",
               params: { spec: { title: "New Feature", content: "Content", status: "draft" } },
               headers: @headers
        }.to change(Spec, :count).by(1)

        expect(response).to have_http_status(:created)
      end

      it "returns 422 when title is blank" do
        post "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs",
             params: { spec: { title: "", content: "Content", status: "draft" } },
             headers: @headers

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end

  describe "PATCH /api/v1/workspaces/:workspace_slug/projects/:project_id/specs/:id" do
    context "when authenticated" do
      it "updates the spec" do
        patch "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs/#{@spec.id}",
              params: { spec: { title: "Updated Title" } },
              headers: @headers

        expect(response).to have_http_status(:ok)
        expect(json_body.dig("data", "title")).to eq("Updated Title")
      end
    end
  end

  describe "DELETE /api/v1/workspaces/:workspace_slug/projects/:project_id/specs/:id" do
    context "when authenticated" do
      it "destroys the spec and returns 204" do
        delete "/api/v1/workspaces/#{@workspace.slug}/projects/#{@project.id}/specs/#{@spec.id}",
               headers: @headers

        expect(response).to have_http_status(:no_content)
      end
    end
  end
end
