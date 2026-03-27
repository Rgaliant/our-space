module Github
  class ListUserReposService
    MAX_PAGES = 10
    PER_PAGE  = 100

    def initialize(github_connection)
      @connection = github_connection
    end

    def call
      client = Github::ApiClient.new(@connection.access_token)
      repos  = []

      (1..MAX_PAGES).each do |page|
        response = client.get_repos(page: page, per_page: PER_PAGE)
        unless response.success?
          return Result.new(success: false, error: "GitHub API error: #{response.status}")
        end

        batch = response.body
        repos.concat(batch)
        break if batch.size < PER_PAGE
      end

      normalized = repos.map do |r|
        {
          github_repo_id:  r["id"].to_s,
          full_name:       r["full_name"],
          name:            r["name"],
          description:     r["description"],
          private:         r["private"],
          default_branch:  r["default_branch"] || "main",
          updated_at:      r["updated_at"]
        }
      end

      Result.new(success: true, payload: normalized)
    end
  end
end
