require "base64"

module Github
  class FetchFilesService
    def initialize(repo, file_list, github_connection)
      @repo       = repo
      @file_list  = file_list
      @connection = github_connection
    end

    def call
      client      = Github::ApiClient.new(@connection.access_token)
      content_map = {}

      @file_list.each do |file|
        response = client.get_file_content(@repo.full_name, file[:path])
        next unless response.success?

        body = response.body
        next unless body.is_a?(Hash) && body["encoding"] == "base64"

        decoded = Base64.decode64(body["content"].to_s.gsub("\n", ""))
                        .encode("UTF-8", invalid: :replace, undef: :replace, replace: "")
        content_map[file[:path]] = decoded
      rescue StandardError => e
        Rails.logger.warn("Failed to fetch #{file[:path]} for #{@repo.full_name}: #{e.message}")
      end

      Result.new(success: true, payload: content_map)
    end
  end
end
