module Github
  class SyncRepositoryJob < ApplicationJob
    queue_as :default

    def perform(repo_id)
      repo = GithubRepository.find(repo_id)
      Github::SyncRepositoryService.new(repo).call
    rescue ActiveRecord::RecordNotFound
      # Repo was deleted before job ran — ignore
    end
  end
end
