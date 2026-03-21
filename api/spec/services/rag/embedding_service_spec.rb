require "rails_helper"

RSpec.describe Rag::EmbeddingService do
  fixtures :all

  before(:each) do
    @texts = [ "User authentication spec" ]
    @embedding = Array.new(1024) { 0.1 }
    @voyage_response = {
      "data" => [ { "embedding" => @embedding, "index" => 0 } ],
      "model" => "voyage-3-lite",
      "usage" => { "total_tokens" => 10 }
    }
  end

  describe "#call" do
    context "when Voyage AI returns a successful response" do
      before(:each) do
        stub_request(:post, "https://api.voyageai.com/v1/embeddings")
          .to_return(
            status: 200,
            body: @voyage_response.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "returns a successful result with embeddings" do
        result = described_class.new(@texts).call

        expect(result.success?).to be true
        expect(result.payload).to be_an(Array)
        expect(result.payload.first.length).to eq(1024)
      end
    end

    context "when Voyage AI returns an error" do
      before(:each) do
        stub_request(:post, "https://api.voyageai.com/v1/embeddings")
          .to_return(status: 401, body: '{"error": "Unauthorized"}',
                     headers: { "Content-Type" => "application/json" })
      end

      it "returns a failure result" do
        result = described_class.new(@texts).call

        expect(result.success?).to be false
        expect(result.error).to include("Voyage AI error")
      end
    end
  end
end
