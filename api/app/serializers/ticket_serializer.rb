class TicketSerializer < Blueprinter::Base
  identifier :id

  fields :title,
         :description,
         :status,
         :priority,
         :priority_score,
         :story_points,
         :position,
         :assignee_id,
         :created_by_id,
         :spec_id,
         :project_id,
         :workspace_id,
         :cycle_id,
         :distillation_id,
         :created_at,
         :updated_at

  association :labels, blueprint: LabelSerializer
end
