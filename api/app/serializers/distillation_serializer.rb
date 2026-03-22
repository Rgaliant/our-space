class DistillationSerializer < Blueprinter::Base
  identifier :id

  fields :north_star,
         :plan_content,
         :proposed_tickets,
         :misaligned_ticket_ids,
         :status,
         :workspace_id,
         :created_by_id,
         :created_at,
         :updated_at
end
