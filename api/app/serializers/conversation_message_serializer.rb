class ConversationMessageSerializer < Blueprinter::Base
  identifier :id
  fields :role, :content, :conversation_id, :created_at, :updated_at
end
