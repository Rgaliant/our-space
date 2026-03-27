module Github
  class DisconnectRepositoryService
    def initialize(repo)
      @repo = repo
    end

    def call
      Embedding.where(source_type: "GithubRepository", source_id: @repo.id).delete_all
      @repo.destroy!
      Result.new(success: true, payload: nil)
    rescue ActiveRecord::RecordNotDestroyed => e
      Result.new(success: false, error: e.message)
    end
  end
end
