module Api
  module V1
    class WorkspaceOnboardingController < ApplicationController
      before_action :set_workspace

      def update
        context = @workspace.context.merge(onboarding_params)
        if @workspace.update(context: context)
          render json: { data: { context: @workspace.context } }
        else
          render json: { error: { message: @workspace.errors.full_messages.to_sentence,
                                   code: "ONBOARDING_UPDATE_FAILED" } },
                 status: :unprocessable_entity
        end
      end

      private

      def set_workspace
        @workspace = current_user.workspaces.find_by!(slug: params[:workspace_slug])
      end

      def onboarding_params
        params.expect(onboarding: [ :business_description, :target_users, :key_differentiator, :stage ])
              .to_h
              .transform_keys(&:to_s)
      end
    end
  end
end
