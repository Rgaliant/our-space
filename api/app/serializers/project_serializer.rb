class ProjectSerializer < Blueprinter::Base
  identifier :id
  fields :name, :description, :status, :created_at, :updated_at
end
