class GithubRepositorySerializer < Blueprinter::Base
  identifier :id

  fields :full_name, :name, :description, :default_branch, :private,
         :sync_status, :last_synced_at, :workspace_id, :project_id,
         :metadata, :github_repo_id, :created_at, :updated_at
end
