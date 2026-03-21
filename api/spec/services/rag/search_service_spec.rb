require "rails_helper"

RSpec.describe Rag::SearchService do
  fixtures :all

  before(:each) do
    @workspace = workspaces(:acme)
    @query = "user login"
    @embedding = Array.new(1024) { 0.1 }
    @voyage_response = {
      "data" => [ { "embedding" => @embedding, "index" => 0 } ],
      "model" => "voyage-3-lite",
      "usage" => { "total_tokens" => 5 }
    }
    stub_request(:post, "https://api.voyageai.com/v1/embeddings")
      .to_return(
        status: 200,
        body: @voyage_response.to_json,
        headers: { "Content-Type" => "application/json" }
      )
  end

  describe "#call" do
    context "when there are embeddings in the workspace" do
      it "returns a successful result" do
        result = described_class.new(@query, workspace: @workspace).call

        expect(result.success?).to be true
        expect(result.payload).to be_an(ActiveRecord::Relation)
      end
    end

    context "when the embedding service fails" do
      before(:each) do
        stub_request(:post, "https://api.voyageai.com/v1/embeddings")
          .to_return(status: 500, body: '{"error": "Server Error"}',
                     headers: { "Content-Type" => "application/json" })
      end

      it "returns a failure result" do
        result = described_class.new(@query, workspace: @workspace).call

        expect(result.success?).to be false
      end
    end
  end
end
