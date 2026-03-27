module Github
  class SyncRepositoryService
    def initialize(repo)
      @repo = repo
    end

    def call
      connection = @repo.connected_by.github_connection
      unless connection
        return Result.new(success: false, error: "GitHub connection not found for repo owner")
      end

      @repo.update!(sync_status: "syncing")

      tree_result = Github::FetchFileTreeService.new(@repo, connection).call
      unless tree_result.success?
        @repo.update!(sync_status: "failed")
        return tree_result
      end

      files_result = Github::FetchFilesService.new(@repo, tree_result.payload, connection).call
      unless files_result.success?
        @repo.update!(sync_status: "failed")
        return files_result
      end

      client      = Github::ApiClient.new(connection.access_token)
      commit_text = fetch_commit_text(client)
      pr_text     = fetch_pr_text(client)

      embed_result = Github::EmbedRepositoryService.new(
        @repo,
        content_map: files_result.payload,
        commit_text: commit_text,
        pr_text:     pr_text
      ).call

      if embed_result.success?
        @repo.update!(sync_status: "synced", last_synced_at: Time.current)
        Result.new(success: true, payload: @repo)
      else
        @repo.update!(sync_status: "failed")
        embed_result
      end
    rescue StandardError => e
      begin
        @repo.update!(sync_status: "failed")
      rescue StandardError
        nil
      end
      Result.new(success: false, error: e.message)
    end

    private

    def fetch_commit_text(client)
      response = client.get_commits(@repo.full_name, @repo.default_branch)
      return nil unless response.success?

      response.body
              .map { |c| c.dig("commit", "message").to_s.lines.first&.strip }
              .compact
              .join("\n")
    rescue StandardError
      nil
    end

    def fetch_pr_text(client)
      response = client.get_pull_requests(@repo.full_name)
      return nil unless response.success?

      response.body
              .map { |pr| "#{pr["title"]}\n#{pr["body"]}" }
              .compact
              .join("\n\n")
    rescue StandardError
      nil
    end
  end
end
