class ConversationSerializer < Blueprinter::Base
  identifier :id
  fields :title, :project_id, :workspace_id, :created_at, :updated_at
end
