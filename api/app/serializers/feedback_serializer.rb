class FeedbackSerializer < Blueprinter::Base
  identifier :id
  fields :source, :content, :sentiment, :customer_identifier, :linked_ticket_ids,
         :project_id, :workspace_id, :created_at, :updated_at
end
