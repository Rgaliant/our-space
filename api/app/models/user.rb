class User < ApplicationRecord
  self.primary_key = "id"

  has_many :workspace_members, dependent: :destroy
  has_many :workspaces, through: :workspace_members
  has_many :owned_workspaces, class_name: "Workspace", foreign_key: :owner_id, dependent: :destroy, inverse_of: :owner
  has_many :specs, foreign_key: :created_by_id, inverse_of: :created_by, dependent: :destroy
  has_many :assigned_tickets, class_name: "Ticket", foreign_key: :assignee_id, inverse_of: :assignee, dependent: :nullify
  has_many :created_tickets, class_name: "Ticket", foreign_key: :created_by_id, inverse_of: :created_by, dependent: :destroy
  has_many :conversations

  validates :id, presence: true
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
end
