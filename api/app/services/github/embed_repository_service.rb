module Github
  class EmbedRepositoryService
    CHUNK_SIZE    = 3_000
    CHUNK_OVERLAP = 200
    BATCH_SIZE    = 20

    def initialize(repo, content_map:, commit_text:, pr_text:)
      @repo        = repo
      @content_map = content_map
      @commit_text = commit_text
      @pr_text     = pr_text
    end

    def call
      chunks = build_chunks
      return Result.new(success: true, payload: 0) if chunks.empty?

      Embedding.where(source_type: "GithubRepository", source_id: @repo.id).delete_all

      chunk_index = 0
      chunks.each_slice(BATCH_SIZE) do |batch|
        texts  = batch.map { |c| c[:text] }
        result = Rag::EmbeddingService.new(texts).call
        return result unless result.success?

        vectors = result.payload
        batch.each_with_index do |chunk, i|
          Embedding.create!(
            workspace_id: @repo.workspace_id,
            source_type:  "GithubRepository",
            source_id:    @repo.id,
            chunk_index:  chunk_index,
            content:      chunk[:text],
            embedding:    vectors[i]
          )
          chunk_index += 1
        end
      end

      Result.new(success: true, payload: chunk_index)
    rescue StandardError => e
      Result.new(success: false, error: "Embedding failed: #{e.message}")
    end

    private

    def build_chunks
      chunks = []

      @content_map.each do |path, content|
        prefixed = "File: #{path}\n\n#{content}"
        chunks.concat(chunk_text(prefixed))
      end

      chunks << { text: "Recent commits:\n\n#{@commit_text}" } if @commit_text.present?
      chunks << { text: "Open pull requests:\n\n#{@pr_text}" } if @pr_text.present?

      chunks
    end

    def chunk_text(text)
      return [ { text: text } ] if text.length <= CHUNK_SIZE

      result = []
      start  = 0
      while start < text.length
        result << { text: text[start, CHUNK_SIZE] }
        start += (CHUNK_SIZE - CHUNK_OVERLAP)
      end
      result
    end
  end
end
