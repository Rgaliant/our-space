module Rag
  class EmbeddingService
    VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings"
    MODEL = "voyage-3-lite"

    def initialize(texts)
      @texts = Array(texts)
    end

    def call
      response = client.post(VOYAGE_API_URL) do |req|
        req.headers["Authorization"] = "Bearer #{ENV.fetch("VOYAGE_API_KEY", "placeholder")}"
        req.headers["Content-Type"] = "application/json"
        req.body = { model: MODEL, input: @texts }.to_json
      end

      if response.success?
        embeddings = response.body["data"].map { |d| d["embedding"] }
        Result.new(success: true, payload: embeddings)
      else
        Result.new(success: false, error: "Voyage AI error: #{response.status}")
      end
    rescue Faraday::Error => e
      Result.new(success: false, error: "Network error: #{e.message}")
    end

    private

    def client
      @client ||= Faraday.new do |f|
        f.request :json
        f.response :json
        f.request :retry, max: 2, interval: 0.5
      end
    end
  end
end
