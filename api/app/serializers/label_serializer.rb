class LabelSerializer < Blueprinter::Base
  identifier :id
  fields :name, :color, :workspace_id, :created_at, :updated_at
end
