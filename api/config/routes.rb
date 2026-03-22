Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  post "/webhooks/clerk", to: "webhooks#clerk"

  namespace :api do
    namespace :v1 do
      get "me", to: "auth/me#show"

      resources :workspaces, param: :slug do
        patch "onboarding", to: "workspace_onboarding#update", on: :member

        resources :projects do
          resources :tickets, only: [ :index, :show, :create, :update, :destroy ], controller: "project_tickets" do
            resources :comments, only: [ :index, :create, :destroy ], controller: "ticket_comments"
          end
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

        resources :distillations, only: [ :index, :show ]

        namespace :ai do
          post "plan", to: "plan#create"
          post "distill", to: "distillations#create"
        end
      end
    end
  end
end
