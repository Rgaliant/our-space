class WorkspaceMember < ApplicationRecord
  ROLES = %w[owner admin stakeholder engineer].freeze

  belongs_to :workspace
  belongs_to :user

  validates :role, inclusion: { in: ROLES }
  validates :workspace_id, uniqueness: { scope: :user_id, message: "user is already a member" }

  scope :owners,       -> { where(role: "owner") }
  scope :admins,       -> { where(role: "admin") }
  scope :engineers,    -> { where(role: "engineer") }
  scope :stakeholders, -> { where(role: "stakeholder") }
end
