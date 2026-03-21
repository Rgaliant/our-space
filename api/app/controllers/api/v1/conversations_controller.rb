module Api
  module V1
    class ConversationsController < ApplicationController
      before_action :set_workspace
      before_action :set_conversation, only: [ :show, :destroy ]

      def index
        conversations = @workspace.conversations.where(user: current_user).order(created_at: :desc)
        render json: { data: JSON.parse(ConversationSerializer.render(conversations)) }
      end

      def show
        render json: { data: ConversationSerializer.render_as_hash(@conversation) }
      end

      def create
        conversation = @workspace.conversations.build(conversation_params.merge(user: current_user))
        if conversation.save
          render json: { data: ConversationSerializer.render_as_hash(conversation) }, status: :created
        else
          render json: { error: { message: conversation.errors.full_messages.to_sentence,
                                   code: "CONVERSATION_CREATION_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      def destroy
        @conversation.destroy!
        head :no_content
      end

      private

      def set_workspace
        @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
      end

      def set_conversation
        @conversation = @workspace.conversations.where(user: current_user).find(params[:id])
      end

      def conversation_params
        params.expect(conversation: [ :title, :project_id ])
      end
    end
  end
end
