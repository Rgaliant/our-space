RSpec.configure do |config|
  config.before(:each) do
    stub_request(:post, "https://api.voyageai.com/v1/embeddings")
      .to_return(
        status: 200,
        body: { data: [ { embedding: Array.new(1024, 0.0) } ] }.to_json,
        headers: { "Content-Type" => "application/json" }
      )
  end
end
