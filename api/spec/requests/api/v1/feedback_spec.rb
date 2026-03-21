require "rails_helper"

RSpec.describe "Api::V1::Feedback", type: :request do
  fixtures :all

  before(:each) do
    @workspace = workspaces(:acme)
    @user      = users(:john)
    @headers   = clerk_auth_headers(@user.id)
  end

  describe "GET /api/v1/workspaces/:workspace_slug/feedback" do
    context "when authenticated" do
      it "returns feedback for the workspace" do
        get "/api/v1/workspaces/#{@workspace.slug}/feedback", headers: @headers

        expect(response).to have_http_status(:ok)
        expect(json_body["data"]).to be_an(Array)
      end
    end

    context "when unauthenticated" do
      it "returns 401" do
        get "/api/v1/workspaces/#{@workspace.slug}/feedback"
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "POST /api/v1/workspaces/:workspace_slug/feedback" do
    context "when authenticated" do
      it "creates feedback and returns 201" do
        expect {
          post "/api/v1/workspaces/#{@workspace.slug}/feedback",
               params: { feedback: { content: "Great product!", sentiment: "positive" } },
               headers: @headers
        }.to change(Feedback, :count).by(1)

        expect(response).to have_http_status(:created)
        expect(json_body.dig("data", "content")).to eq("Great product!")
      end

      it "returns 422 when content is blank" do
        post "/api/v1/workspaces/#{@workspace.slug}/feedback",
             params: { feedback: { content: "" } },
             headers: @headers

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end
end
