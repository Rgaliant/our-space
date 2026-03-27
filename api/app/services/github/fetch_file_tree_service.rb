module Github
  class FetchFileTreeService
    EMBEDDABLE_EXTENSIONS = %w[.rb .py .ts .tsx .js .jsx .go .rs .java .kt .swift .cs .php].freeze
    PRIORITY_FILES  = %w[README.md README].freeze
    MANIFEST_FILES  = %w[package.json Gemfile pyproject.toml requirements.txt Cargo.toml go.mod composer.json].freeze
    SKIP_SUBSTRINGS = %w[node_modules .git vendor/ dist/ build/ __pycache__ .lock].freeze
    MAX_SOURCE_FILES = 150
    MAX_FILE_SIZE    = 50_000

    def initialize(repo, github_connection)
      @repo       = repo
      @connection = github_connection
    end

    def call
      client   = Github::ApiClient.new(@connection.access_token)
      response = client.get_file_tree(@repo.full_name, @repo.default_branch)

      unless response.success?
        return Result.new(success: false, error: "GitHub tree fetch failed: #{response.status}")
      end

      if response.body["truncated"]
        Rails.logger.warn("GitHub tree truncated for #{@repo.full_name} — some files will be skipped")
      end

      tree  = response.body["tree"] || []
      files = filter_files(tree)
      Result.new(success: true, payload: files)
    end

    private

    def filter_files(tree)
      blobs = tree.select { |f| f["type"] == "blob" }

      priority  = []
      manifests = []
      source    = []

      blobs.each do |f|
        path = f["path"]
        next if skip_path?(path)

        size = f["size"].to_i
        base = File.basename(path)
        ext  = File.extname(path)

        if PRIORITY_FILES.include?(base)
          priority << build_entry(f)
        elsif MANIFEST_FILES.include?(base)
          manifests << build_entry(f)
        elsif EMBEDDABLE_EXTENSIONS.include?(ext) && size <= MAX_FILE_SIZE
          source << build_entry(f)
        end
      end

      (priority + manifests + source.first(MAX_SOURCE_FILES))
    end

    def build_entry(f)
      { path: f["path"], sha: f["sha"], size: f["size"].to_i }
    end

    def skip_path?(path)
      SKIP_SUBSTRINGS.any? { |s| path.include?(s) }
    end
  end
end
