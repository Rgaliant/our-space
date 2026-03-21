module Api
  module V1
    module Auth
      class MeController < ApplicationController
        def show
          render json: {
            data: {
              id:           current_user.id,
              email:        current_user.email,
              display_name: current_user.display_name,
              avatar_url:   current_user.avatar_url
            }
          }
        end
      end
    end
  end
end
