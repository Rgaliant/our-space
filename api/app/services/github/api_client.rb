module Github
  class ApiClient
    GITHUB_BASE_URL = "https://api.github.com"
    OAUTH_URL       = "https://github.com"

    def initialize(access_token)
      @access_token = access_token
    end

    def get_repos(page: 1, per_page: 100)
      get("/user/repos", type: "owner", sort: "updated", per_page: per_page, page: page)
    end

    def get_file_tree(full_name, branch)
      get("/repos/#{full_name}/git/trees/#{branch}", recursive: 1)
    end

    def get_file_content(full_name, path)
      get("/repos/#{full_name}/contents/#{path}")
    end

    def get_commits(full_name, branch, per_page: 50)
      get("/repos/#{full_name}/commits", sha: branch, per_page: per_page)
    end

    def get_pull_requests(full_name, state: "open", per_page: 50)
      get("/repos/#{full_name}/pulls", state: state, per_page: per_page)
    end

    def get_user
      get("/user")
    end

    def self.exchange_code(code)
      conn = Faraday.new(OAUTH_URL) do |f|
        f.request :json
        f.response :json
        f.request :retry, max: 2, interval: 0.5
      end
      conn.post("/login/oauth/access_token") do |req|
        req.headers["Accept"] = "application/json"
        req.body = {
          client_id: ENV.fetch("GITHUB_CLIENT_ID", ""),
          client_secret: ENV.fetch("GITHUB_CLIENT_SECRET", ""),
          code: code
        }
      end
    end

    private

    def get(path, params = {})
      client.get("#{GITHUB_BASE_URL}#{path}", params)
    end

    def client
      @client ||= Faraday.new do |f|
        f.request :json
        f.response :json
        f.request :retry, max: 2, interval: 0.5
        f.headers["Authorization"]        = "Bearer #{@access_token}"
        f.headers["Accept"]               = "application/vnd.github+json"
        f.headers["X-GitHub-Api-Version"] = "2022-11-28"
      end
    end
  end
end
