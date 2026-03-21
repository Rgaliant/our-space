Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  post "/webhooks/clerk", to: "webhooks#clerk"

  namespace :api do
    namespace :v1 do
      get "me", to: "auth/me#show"

      resources :workspaces, param: :slug do
        resources :projects do
          resources :specs do
            resources :tickets
          end
          resources :feedback, only: [ :index, :create, :show, :destroy ]
        end
        resources :conversations do
          resources :messages, only: [ :index, :create ], controller: "conversation_messages"
        end
        namespace :ai do
          post "plan",   to: "plan#create"
          post "ticket", to: "ticket#create"
        end
      end
    end
  end
end
