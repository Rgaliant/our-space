class PullRequestSerializer < Blueprinter::Base
  identifier :id

  fields :url, :title, :repo, :pr_number, :status, :ticket_id, :created_at, :updated_at
end
