module Rag
  class SearchService
    DEFAULT_LIMIT = 5

    def initialize(query, workspace:, source_types: nil, limit: DEFAULT_LIMIT)
      @query = query
      @workspace = workspace
      @source_types = source_types
      @limit = limit
    end

    def call
      embedding_result = Rag::EmbeddingService.new(@query).call
      return embedding_result unless embedding_result.success?

      query_embedding = embedding_result.payload.first
      results = find_similar(query_embedding)
      Result.new(success: true, payload: results)
    end

    private

    def find_similar(query_embedding)
      scope = Embedding.for_workspace(@workspace)
      scope = scope.by_source(@source_types) if @source_types.present?

      vector_literal = "[#{query_embedding.join(",")}]"
      scope
        .where.not(embedding: nil)
        .order(Arel.sql("embedding <=> '#{ActiveRecord::Base.sanitize_sql(vector_literal)}'::vector"))
        .limit(@limit)
    end
  end
end
