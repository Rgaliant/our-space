class TicketCommentSerializer < Blueprinter::Base
  identifier :id

  fields :body, :ticket_id, :workspace_id, :author_id, :created_at, :updated_at

  association :author, blueprint: UserSerializer
end
