class CycleSerializer < Blueprinter::Base
  identifier :id

  fields :name, :status, :start_date, :end_date, :project_id, :workspace_id, :created_by_id, :created_at, :updated_at

  field :ticket_count do |cycle|
    cycle.tickets.size
  end
end
