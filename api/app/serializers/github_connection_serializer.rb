class GithubConnectionSerializer < Blueprinter::Base
  identifier :id

  fields :github_login, :github_user_id, :scopes, :created_at, :updated_at
end
