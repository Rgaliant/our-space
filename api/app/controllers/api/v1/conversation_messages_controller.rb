module Api
  module V1
    class ConversationMessagesController < ApplicationController
      before_action :set_workspace
      before_action :set_conversation

      def index
        messages = @conversation.messages.order(:created_at)
        render json: { data: JSON.parse(ConversationMessageSerializer.render(messages)) }
      end

      def create
        message = @conversation.messages.build(message_params)
        if message.save
          render json: { data: ConversationMessageSerializer.render_as_hash(message) }, status: :created
        else
          render json: { error: { message: message.errors.full_messages.to_sentence,
                                   code: "MESSAGE_CREATION_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      private

      def set_workspace
        @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
      end

      def set_conversation
        @conversation = @workspace.conversations.find(params[:conversation_id])
      end

      def message_params
        params.expect(message: [ :role, :content ])
      end
    end
  end
end
