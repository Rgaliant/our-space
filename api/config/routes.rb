Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  post "/webhooks/clerk", to: "webhooks#clerk"

  namespace :api do
    namespace :v1 do
      get "me", to: "auth/me#show"

      resources :workspaces, param: :slug do
        patch "onboarding", to: "workspace_onboarding#update", on: :member

        resources :projects do
          resources :tickets, only: [ :index, :update ], controller: "project_tickets"
          resources :specs do
            resources :tickets
          end
          resources :feedback, only: [ :index, :show, :create, :update, :destroy ]
          namespace :ai do
            post "prioritize", to: "prioritize#create"
            post "tickets/:ticket_id/assistant", to: "ticket#create"
          end
        end

        resources :conversations do
          resources :messages, only: [ :index, :create ], controller: "conversation_messages"
        end

        resources :feedback, only: [ :index, :show, :create, :update, :destroy ]

        namespace :ai do
          post "plan", to: "plan#create"
        end
      end
    end
  end
end
