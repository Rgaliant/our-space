class SpecSerializer < Blueprinter::Base
  identifier :id

  fields :title,
         :content,
         :status,
         :ai_generated,
         :created_by_id,
         :project_id,
         :workspace_id,
         :created_at,
         :updated_at
end
